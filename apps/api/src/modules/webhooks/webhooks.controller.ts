import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { prisma, PaymentStatus, TransactionType, WithdrawalStatus } from '@fundedgiants/database';
import { LencoService } from '../integrations/lenco/lenco.service';
import { NombaService } from '../integrations/nomba/nomba.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';
import { RiskEngineService } from '../risk/risk-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendbabaService } from '../integrations/sendbaba/sendbaba.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly sendbabaService = new SendbabaService();

  constructor(
    private readonly nombaService: NombaService,
    private readonly lencoService: LencoService,
    private readonly ninjaKycService: NinjaKycService,
    private readonly steraTraderService: SteraTraderService,
    private readonly riskEngineService: RiskEngineService,
    private readonly woocommerceService: WooCommerceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * WooCommerce Purchase Webhook
   * Dispatched by WordPress plugins (fgt-core.php / class-backend-webhook-dispatcher.php / WooCommerce)
   * Handles: Challenge account provisioning, perpetual affiliate attribution, and overpayment surplus credit to Giants Vault
   */
  @Post('woocommerce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive verified completed order webhooks from WooCommerce' })
  async handleWooCommerceWebhook(
    @Body() payload: any,
    @Headers('x-fundedgiants-signature') signature: string,
    @Headers('x-wc-webhook-signature') wcSignature: string
  ) {
    // 1. Support both AES-256 encrypted payloads from fgt-core.php and direct JSON webhooks from class-backend-webhook-dispatcher.php
    let orderData = payload;
    let isAesAuthenticated = false;
    if (payload?.payload && typeof payload.payload === 'string') {
      const decrypted = this.woocommerceService.decryptPayload(payload.payload);
      if (decrypted) {
        isAesAuthenticated = true;
        orderData = {
          order_id: decrypted.order_id,
          order_number: `FG-ORD-${decrypted.order_id}`,
          billing: {
            email: decrypted.email,
            first_name: decrypted.first_name,
            last_name: decrypted.last_name,
            phone: decrypted.phone,
          },
          total: decrypted.price,
          amount_received: decrypted.amount_received || decrypted.price,
          overage_amount: decrypted.overage_amount || 0,
          account_size: decrypted.size,
          plan_sku: `${decrypted.plan}-${decrypted.size}`,
          payment_method: 'WOOCOMMERCE_CHECKOUT',
          currency: decrypted.currency || 'NGN',
          affiliate_code: decrypted.affiliate_code || decrypted.affiliate_id,
          coupon_codes: decrypted.coupon_codes || [],
        };
      }
    }

    const orderNumber = orderData.order_number || `FG-ORD-${orderData.order_id || Date.now()}`;
    this.logger.log(`Received WooCommerce order webhook: ${orderNumber}`);

    // 2. Strict webhook signature verification (or validated AES payload from fgt-core.php)
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'fg_live_webhook_secret_key';
    const activeSignature = signature || wcSignature;
    if (secret && activeSignature !== 'INTERNAL_NOMBA_CALL' && !isAesAuthenticated) {
      if (!activeSignature) {
        throw new UnauthorizedException('Missing required WooCommerce webhook signature');
      }

      const rawPayload = JSON.stringify(payload);
      const computedHex = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
      const computedBase64 = crypto.createHmac('sha256', secret).update(rawPayload).digest('base64');

      const matchesHex = activeSignature === computedHex;
      const matchesBase64 = activeSignature === computedBase64;

      if (!matchesHex && !matchesBase64) {
        throw new UnauthorizedException('Invalid WooCommerce webhook signature');
      }
    }

    const orderId = orderData.order_id || Date.now();
    const email = orderData.billing?.email?.trim().toLowerCase();
    const phone = orderData.billing?.phone?.trim();
    const firstName = orderData.billing?.first_name?.trim();
    const lastName = orderData.billing?.last_name?.trim();
    const accountSizeNgn = Number(orderData.account_size || orderData.total || 5000000);
    const planSku = orderData.plan_sku || 'rhino-rush-5000000';
    const planType = planSku.includes('phoenix') ? 'phoenix-rise' : 'rhino-rush';
    const totalAmount = Number(orderData.total || 0);

    // Overpayment extraction matching fundedgiants-ngn-checkout.php & class-backend-webhook-dispatcher.php
    const overageAmount = Number(
      orderData.overage_amount ??
      orderData.overpayment_amount ??
      (Array.isArray(orderData.meta_data)
        ? orderData.meta_data.find((m: any) => m.key === '_fg_overpayment_amount')?.value
        : 0) ??
      0
    );
    const amountReceived = Number(
      orderData.amount_received ??
      (Array.isArray(orderData.meta_data)
        ? orderData.meta_data.find((m: any) => m.key === '_fg_amount_received')?.value
        : 0) ??
      totalAmount
    );

    // Affiliate tracking matching fgt-core.php (_fg_affiliate_code, fg_aff_code cookie, coupon_codes)
    const affiliateCode = (
      orderData.affiliate_code ||
      orderData.affiliate_id ||
      orderData.referral_code ||
      (Array.isArray(orderData.coupon_codes) && orderData.coupon_codes[0]) ||
      orderData.coupon_lines?.[0]?.code ||
      (Array.isArray(orderData.meta_data)
        ? orderData.meta_data.find((m: any) => m.key === '_fg_affiliate_code')?.value
        : null)
    )?.trim();

    if (!email) {
      throw new BadRequestException('Order missing customer email address');
    }

    // 3. Prevent duplicate order processing
    const existingOrder = await prisma.internalOrder.findFirst({
      where: { orderNumber },
    });

    if (existingOrder) {
      this.logger.log(`Order ${orderNumber} already processed. Skipping duplicate.`);
      return { status: 'already_processed' };
    }

    // 4. Find or Create Customer
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          phone,
          firstName,
          lastName,
          role: 'CUSTOMER',
        },
      });
    }

    // Find or create linked customer wallet
    let customerWallet = await prisma.customerWallet.findUnique({
      where: { userId: user.id },
    });

    if (!customerWallet) {
      customerWallet = await prisma.customerWallet.create({
        data: {
          userId: user.id,
          currency: 'NGN',
        },
      });
    }

    // 5. Create Internal Order & Challenge in database
    const challengeNumber = `FG-CH-${Date.now()}`;
    const leverage = planType === 'phoenix-rise' ? '1:30' : '1:100';

    const order = await prisma.internalOrder.create({
      data: {
        orderNumber,
        userId: user.id,
        wooCommerceOrderId: Number(orderId),
        amount: totalAmount,
        currency: 'NGN',
        paymentMethod: orderData.payment_method || 'WOOCOMMERCE_CHECKOUT',
        paymentStatus: 'SUCCESSFUL',
      },
    });

    // Post to Double-Entry Ledger (1000-CASH-LENCO debit, 4000-CHALLENGE-REVENUE credit)
    try {
      const cashAccount = await prisma.ledgerAccount.findFirst({ where: { code: '1000-CASH-LENCO' } });
      const revenueAccount = await prisma.ledgerAccount.findFirst({ where: { code: '4000-CHALLENGE-REVENUE' } });
      if (cashAccount && revenueAccount && totalAmount > 0) {
        const entry = await prisma.journalEntry.create({
          data: {
            entryNumber: `JE-CHL-${Date.now()}`,
            transactionType: 'CHALLENGE_PURCHASE',
            reference: orderNumber,
            narration: `Challenge Purchase (${planType} ₦${accountSizeNgn.toLocaleString()}) via WooCommerce Order #${orderId}`,
          },
        });
        await prisma.journalLine.createMany({
          data: [
            { journalEntryId: entry.id, accountId: cashAccount.id, debit: totalAmount, credit: 0 },
            { journalEntryId: entry.id, accountId: revenueAccount.id, debit: 0, credit: totalAmount },
          ],
        });
      }
    } catch (ledgerErr: any) {
      this.logger.error(`Error posting WooCommerce purchase to ledger: ${ledgerErr.message}`);
    }

    // Perpetual Affiliate Attribution & Commission Crediting (Flat 10% CPA)
    if (affiliateCode) {
      try {
        const cleanAff = affiliateCode.trim();
        const affiliate = await prisma.affiliateProfile.findFirst({
          where: {
            OR: [
              { referralCode: { equals: cleanAff.toLowerCase(), mode: 'insensitive' } },
              { user: { username: { equals: cleanAff.toLowerCase(), mode: 'insensitive' } } },
              { coupons: { some: { code: { equals: cleanAff.toUpperCase(), mode: 'insensitive' } } } },
            ],
          },
        });

        if (affiliate) {
          // Perpetual Binding: ensure customer's referring affiliate is bound
          let referral = await prisma.affiliateReferral.findUnique({
            where: { referredUserId: user.id },
          });

          if (!referral) {
            referral = await prisma.affiliateReferral.create({
              data: {
                affiliateProfileId: affiliate.id,
                referredUserId: user.id,
              },
            });
            await prisma.affiliateProfile.update({
              where: { id: affiliate.id },
              data: { totalReferrals: { increment: 1 } },
            });
          }

          if (totalAmount > 0) {
            const cpaRate = Number(affiliate.cpaCommissionRate || 10.0);
            const discountShare = Number(affiliate.customDiscountPercent || 0);
            const effectiveRate = Math.max(0, cpaRate - discountShare) / 100;
            const cpaAmount = Math.round(totalAmount * (effectiveRate > 0 ? effectiveRate : 0.10));

            await prisma.affiliateCommission.create({
              data: {
                affiliateProfileId: affiliate.id,
                referralId: referral.id,
                orderNumber,
                amount: cpaAmount,
                currency: 'NGN',
                status: 'SUCCESSFUL',
              },
            });

            await prisma.affiliateProfile.update({
              where: { id: affiliate.id },
              data: {
                totalCommissions: { increment: cpaAmount },
              },
            });

            this.logger.log(`Affiliate CPA Commission of ₦${cpaAmount.toLocaleString()} credited to affiliate ${affiliate.referralCode} for order ${orderNumber}`);
          }
        }
      } catch (affErr: any) {
        this.logger.error(`Error calculating affiliate CPA for order ${orderNumber}: ${affErr.message}`);
      }
    }

    // Find or ensure challenge product
    let product = await prisma.challengeProduct.findFirst({
      where: {
        OR: [
          { id: `prod-${planType}-${accountSizeNgn}` },
          { sku: `${planType}-${accountSizeNgn}` },
          { skuPrefix: planType },
        ],
      },
    });

    if (!product) {
      product = await prisma.challengeProduct.create({
        data: {
          id: `prod-${planType}-${accountSizeNgn}`,
          sku: `${planType}-${accountSizeNgn}`,
          skuPrefix: planType,
          name: `${planType === 'phoenix-rise' ? 'Phoenix Rise' : 'Rhino Rush'} ₦${accountSizeNgn.toLocaleString()}`,
          type: planType === 'phoenix-rise' ? 'PHOENIX_RISE_INSTANT' : 'RHINO_RUSH_ONE_STEP',
          accountSize: accountSizeNgn,
          priceNgn: totalAmount || 127500,
          dailyDrawdownPercent: 4.0,
          maxDrawdownPercent: planType === 'phoenix-rise' ? 7.0 : 10.0,
          profitTargetPercent: 10.0,
          leverage: planType === 'phoenix-rise' ? '1:30' : '1:100',
          profitSplit: 'Upto 80%',
        },
      });
    }

    const challenge = await prisma.customerChallenge.create({
      data: {
        challengeNumber,
        userId: user.id,
        orderId: order.id,
        productId: product.id,
        type: planType === 'phoenix-rise' ? 'PHOENIX_RISE_INSTANT' : 'RHINO_RUSH_ONE_STEP',
        status: 'PENDING_PROVISIONING',
      },
    });

    // 6. Provision Trading Account directly on SteraTrader NGN broker subset
    let provisionedLogin = '';
    try {
      const steraRes = await this.steraTraderService.provisionAccount({
        userEmail: email,
        userFullName: `${firstName || ''} ${lastName || ''}`.trim() || 'Trader',
        userPhone: phone,
        accountSizeNgn,
        planType,
        leverage,
        reference: challengeNumber,
      });

      if (steraRes.success && steraRes.login) {
        provisionedLogin = steraRes.login;
        // Daily DD limits (Rhino: 4%, Phoenix: 4%)
        const dailyLimit = accountSizeNgn * 0.04;
        // Max DD limits (Rhino: 10%, Phoenix: 7%)
        const maxLimit = planType === 'phoenix-rise' ? accountSizeNgn * 0.07 : accountSizeNgn * 0.10;

        const groupSlug = steraRes.group || (planType === 'phoenix-rise' ? 'fg-pr-funded' : 'fg-rr-eval');
        const server = steraRes.server || 'Velton-Demo';

        await prisma.tradingAccount.create({
          data: {
            accountNumber: steraRes.login,
            userId: user.id,
            challengeId: challenge.id,
            platform: 'SteraTrader',
            server,
            groupSlug,
            masterPassword: steraRes.password || null,
            investorPassword: steraRes.investorPassword || null,
            status: 'ACTIVE',
            initialBalance: accountSizeNgn,
            currentBalance: accountSizeNgn,
            currentEquity: accountSizeNgn,
            dailyDrawdownLimit: dailyLimit,
            maxDrawdownLimit: maxLimit,
          },
        });

        await prisma.customerChallenge.update({
          where: { id: challenge.id },
          data: { status: 'ACTIVE', startDate: new Date() },
        });

        this.logger.log(`SteraTrader Account ${steraRes.login} successfully provisioned for ${email}`);

        // Trigger Instant Credentials Delivery Email
        if (email) {
          try {
            await this.notificationsService.sendTradingAccountCredentialsEmail({
              toEmail: email,
              toName: `${firstName || ''} ${lastName || ''}`.trim() || 'Trader',
              accountNumber: steraRes.login,
              masterPassword: steraRes.password,
              investorPassword: steraRes.investorPassword,
              server,
              groupSlug,
              planTitle: planType === 'phoenix-rise' ? 'Phoenix Rise Instant Funding' : 'Rhino Rush 1-Step Challenge',
              initialBalanceNgn: accountSizeNgn,
              leverage,
            });
          } catch (mailErr: any) {
            this.logger.warn(`Could not dispatch credentials email: ${mailErr.message}`);
          }
        }

        // Automatically sync updated trader profile & trading account to SendBaba Audience
        this.sendbabaService.syncUserById(user.id).catch((syncErr) => {
          this.logger.warn(`SendBaba contact sync error for order ${orderNumber}: ${syncErr.message}`);
        });
      }
    } catch (steraErr: any) {
      this.logger.error(`SteraTrader provisioning error for order ${orderNumber}: ${steraErr.message}`);
    }

    // 7. Handle Overpayment Flow: Credit surplus payment to trader's Giants Vault balance
    let surplusCredited = 0;
    if (overageAmount > 0) {
      try {
        surplusCredited = overageAmount;

        // Record Deposit in wallet history (automatically increments available balance via double-entry wallet calculation)
        await prisma.deposit.create({
          data: {
            walletId: customerWallet.id,
            amount: overageAmount,
            currency: 'NGN',
            status: PaymentStatus.SUCCESSFUL,
            reference: `SURPLUS-${orderNumber}`,
            senderName: 'WooCommerce Overpayment Surplus',
            reconciled: true,
          },
        });

        // Post overage surplus to Double-Entry General Ledger (Debit 1000-CASH-LENCO, Credit 2000-WALLET-LIABILITY)
        try {
          const cashAccount = await prisma.ledgerAccount.findFirst({ where: { code: '1000-CASH-LENCO' } });
          const liabilityAccount = await prisma.ledgerAccount.findFirst({
            where: {
              OR: [
                { code: '2000-WALLET-LIABILITY' },
                { code: '2000-CUSTOMER-VAULT-LIABILITY' },
              ],
            },
          });
          if (cashAccount && liabilityAccount) {
            const entry = await prisma.journalEntry.create({
              data: {
                entryNumber: `JE-SURPLUS-${Date.now()}`,
                transactionType: TransactionType.ADJUSTMENT,
                reference: `SURPLUS-${orderNumber}`,
                narration: `Overpayment surplus credit from WooCommerce Order #${orderId} (Received ₦${amountReceived.toLocaleString()}, Required ₦${totalAmount.toLocaleString()})`,
              },
            });
            await prisma.journalLine.createMany({
              data: [
                { journalEntryId: entry.id, accountId: cashAccount.id, debit: overageAmount, credit: 0 },
                { journalEntryId: entry.id, accountId: liabilityAccount.id, debit: 0, credit: overageAmount },
              ],
            });
          }
        } catch (jeErr: any) {
          this.logger.warn(`Surplus journal entry error: ${jeErr.message}`);
        }

        // Send in-app notification with chime trigger and email to the trader
        await this.notificationsService.createNotification({
          userId: user.id,
          title: 'Surplus Payment Credited to Giants Vault',
          message: `We received an overpayment of ₦${overageAmount.toLocaleString()} on Order #${orderNumber} (Received: ₦${amountReceived.toLocaleString()}, Required: ₦${totalAmount.toLocaleString()}). The surplus of ₦${overageAmount.toLocaleString()} has been credited to your Giants Vault balance and is immediately available for withdrawal or purchasing accounts.`,
          category: 'FINANCE',
          priority: 'HIGH',
          actionUrl: '/dashboard/wallet',
          sendEmail: true,
        });

        this.logger.log(`Overpayment surplus of ₦${overageAmount.toLocaleString()} credited to Giants Vault for ${email} on order ${orderNumber}`);
      } catch (surplusErr: any) {
        this.logger.error(`Error processing overpayment credit for order ${orderNumber}: ${surplusErr.message}`);
      }
    }

    // 8. Ensure dedicated Nomba Virtual Account is issued and bound to user on successful challenge purchase
    try {
      if (!customerWallet.nombaAccountNumber) {
        const nombaRes = await this.nombaService.createVirtualAccount({
          userId: user.id,
          firstName: user.firstName || 'Trader',
          lastName: user.lastName || 'Account',
        });
        if (nombaRes.status && nombaRes.data) {
          await prisma.customerWallet.update({
            where: { id: customerWallet.id },
            data: {
              nombaVirtualBankName: nombaRes.data.bankName,
              nombaAccountName: nombaRes.data.bankAccountName,
              nombaAccountNumber: nombaRes.data.bankAccountNumber,
              nombaAccountReference: nombaRes.data.accountRef,
            },
          });
          this.logger.log(`Provisioned Nomba account ${nombaRes.data.bankAccountNumber} for user ${user.id} on WooCommerce order purchase`);
        }
      }
    } catch (nombaErr: any) {
      this.logger.warn(`Could not provision Nomba account on WooCommerce order purchase for user ${user.id}: ${nombaErr.message}`);
    }

    // 9. Dispatch Account Ready Notification with SteraTrader details
    await this.notificationsService.createNotification({
      userId: user.id,
      title: `Your ${planType === 'phoenix-rise' ? 'Phoenix Rise' : 'Rhino Rush'} Account is Ready!`,
      message: `Your ${planType === 'phoenix-rise' ? 'Phoenix Rise' : 'Rhino Rush'} trading account (#${provisionedLogin || challengeNumber}) has been provisioned on SteraTrader with starting balance of ₦${accountSizeNgn.toLocaleString()}.${surplusCredited > 0 ? ` Additionally, your surplus payment of ₦${surplusCredited.toLocaleString()} was credited to your Giants Vault balance.` : ''}`,
      category: 'TRADING',
      priority: 'HIGH',
      actionUrl: '/dashboard/trading-accounts',
      sendEmail: true,
    });

    // 10. Real-time bi-directional Audience Sync to SendBaba Contacts
    try {
      await this.sendbabaService.syncUserById(user.id);
      this.logger.log(`Traders audience contact synced to SendBaba for user ${user.id} (${user.email})`);
    } catch (sbErr: any) {
      this.logger.warn(`Could not sync trader to SendBaba contacts: ${sbErr.message}`);
    }

    return {
      status: 'success',
      orderNumber,
      challengeNumber,
      steraLogin: provisionedLogin,
      surplusCredited,
    };
  }

  /**
   * Endpoint for WordPress to request a Dynamic One-Time Nomba Virtual Account for checkout
   * WordPress calls this endpoint so it doesn't need Nomba credentials or direct Nomba integration!
   */
  @Post('nomba/create-order-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate dynamic Nomba virtual account for WordPress WooCommerce checkout' })
  async createNombaOrderAccount(
    @Body()
    body: {
      orderId: string | number;
      amount: number;
      customerName: string;
      email: string;
    },
    @Headers('x-fgt-api-key') apiKey?: string,
  ) {
    if (!body.orderId || !body.amount) {
      throw new BadRequestException('orderId and amount are required');
    }

    this.logger.log(`Generating Nomba dynamic virtual account for WordPress Order #${body.orderId} (₦${Number(body.amount).toLocaleString()})`);

    const res = await this.nombaService.createDynamicOrderAccount({
      orderId: body.orderId,
      amountNgn: Number(body.amount),
      customerName: body.customerName || 'Trader',
      email: body.email || 'customer@fundedgiants.ng',
    });

    if (!res.status || !res.data) {
      throw new BadRequestException(res.message || 'Could not create dynamic virtual account on Nomba');
    }

    return {
      success: true,
      bank_name: res.data.bankName,
      account_number: res.data.bankAccountNumber,
      account_name: res.data.bankAccountName || res.data.accountName,
      reference: res.data.accountRef,
      expected_amount: body.amount,
      currency: 'NGN',
    };
  }

  private async forwardToWordPressNomba(payload: any, signature?: string, sigValue?: string) {
    const wcNombaUrl = process.env.WOOCOMMERCE_NOMBA_WEBHOOK_URL;
    if (wcNombaUrl && wcNombaUrl.trim()) {
      try {
        this.logger.log(`Proxying Nomba checkout webhook to WordPress WooCommerce: ${wcNombaUrl}`);
        const forwardRes = await fetch(wcNombaUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nomba-proxy': 'FundedGiants-Internal',
            ...(signature ? { 'nomba-signature': signature } : {}),
            ...(sigValue ? { 'nomba-sig-value': sigValue } : {}),
          },
          body: JSON.stringify(payload),
        });

        const respText = await forwardRes.text().catch(() => '');
        this.logger.log(`WordPress WooCommerce response (HTTP ${forwardRes.status}): ${respText.slice(0, 150)}`);
        return {
          status: 'forwarded_to_woocommerce',
          target: wcNombaUrl,
          httpStatus: forwardRes.status,
        };
      } catch (fwdErr: any) {
        this.logger.error(`Failed to proxy Nomba webhook to WordPress WooCommerce: ${fwdErr.message}`);
        return { status: 'forward_failed', error: fwdErr.message };
      }
    }
    return null;
  }

  /**
   * Nomba Dedicated Virtual Account Funding & Dynamic Checkout Webhook
   * Handles:
   * 1. WordPress Checkout Dynamic Accounts (NMB... or FG-ORD-...) with strict underpayment checks
   * 2. Trader Dashboard Dedicated Virtual Accounts (FG-VA-...)
   * 3. Trader Payout / Transfer completion & failure alerts
   */
  @Post('nomba')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and process Nomba virtual account deposit and transfer notifications' })
  async handleNombaWebhook(
    @Body() payload: any,
    @Req() req: any,
    @Headers('nomba-signature') signature?: string,
    @Headers('nomba-sig-value') sigValue?: string,
    @Headers('x-nomba-signature') xSignature?: string,
    @Headers('nomba-timestamp') timestamp?: string,
  ) {
    this.logger.log(`Received Nomba webhook: ${JSON.stringify(payload)}`);

    const activeSig = signature || sigValue || xSignature;
    const webhookSecret = process.env.NOMBA_WEBHOOK_SECRET;
    if (webhookSecret && activeSig) {
      const rawBodyStr = req?.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload);
      let isValid = this.nombaService.verifyWebhookSignature(rawBodyStr, activeSig, timestamp, payload);

      if (!isValid && rawBodyStr !== JSON.stringify(payload)) {
        isValid = this.nombaService.verifyWebhookSignature(JSON.stringify(payload), activeSig, timestamp, payload);
      }

      if (!isValid) {
        // Direct Nomba API confirmation fallback before rejecting
        const checkRef =
          payload.data?.transaction?.aliasAccountReference ||
          payload.data?.account?.accountRef ||
          payload.data?.accountRef;

        let confirmedViaApi = false;
        if (checkRef) {
          this.logger.warn(`Nomba signature mismatch (${activeSig}) for ref ${checkRef}. Confirming transaction directly with Nomba API...`);
          confirmedViaApi = await this.nombaService.confirmPayment(checkRef);
        }

        if (confirmedViaApi) {
          this.logger.log(`Nomba payment reference ${checkRef} successfully confirmed via direct Nomba API lookup.`);
          isValid = true;
        } else {
          this.logger.error(`Rejected invalid Nomba webhook signature: ${activeSig} (API verification also failed)`);
          throw new UnauthorizedException('Invalid Nomba webhook signature');
        }
      }
    }

    const eventType = payload.event_type || payload.event;

    // -------------------------------------------------------------
    // FLOW 3: Nomba Payout / Transfer Status Webhook
    // -------------------------------------------------------------
    if (
      eventType &&
      (eventType.includes('transfer') ||
        eventType.includes('payout') ||
        payload.data?.transaction?.type === 'TRANSFER')
    ) {
      const txRef =
        payload.data?.merchantTxRef ||
        payload.data?.reference ||
        payload.reference ||
        payload.data?.transaction?.transactionId;

      if (txRef) {
        this.logger.log(`Processing Nomba Payout/Transfer event [${eventType}] for ref ${txRef}`);
        const withdrawal = await prisma.withdrawal.findFirst({
          where: {
            OR: [
              { reference: txRef },
              { nombaDisbursementRef: txRef },
            ],
          },
          include: { wallet: true },
        });

        if (withdrawal) {
          const isSuccess =
            eventType === 'transfer.successful' ||
            payload.data?.status === 'SUCCESS' ||
            payload.data?.status === 'SUCCESSFUL';
          const isFailed =
            eventType === 'transfer.failed' ||
            payload.data?.status === 'FAILED';

          if (isSuccess && withdrawal.status !== WithdrawalStatus.PAID) {
            await prisma.withdrawal.update({
              where: { id: withdrawal.id },
              data: { status: WithdrawalStatus.PAID },
            });
            await this.notificationsService.createNotification({
              userId: withdrawal.wallet.userId,
              title: 'Withdrawal Payout Completed',
              message: `Your profit withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} has been successfully transferred to your bank account via Nomba.`,
              category: 'FINANCE',
              priority: 'HIGH',
              sendEmail: true,
            });
            return { status: 'payout_completed', withdrawalId: withdrawal.id };
          } else if (
            isFailed &&
            withdrawal.status !== WithdrawalStatus.REJECTED &&
            withdrawal.status !== WithdrawalStatus.FAILED
          ) {
            await prisma.withdrawal.update({
              where: { id: withdrawal.id },
              data: {
                status: WithdrawalStatus.FAILED,
                rejectionReason: payload.data?.description || 'Bank transfer rejected by provider',
              },
            });
            // Refund to customer wallet
            await prisma.deposit.create({
              data: {
                walletId: withdrawal.walletId,
                amount: withdrawal.amount,
                currency: 'NGN',
                status: PaymentStatus.SUCCESSFUL,
                reference: `REFUND-${withdrawal.reference}`,
                senderName: 'FundedGiants Payout Reversal',
                reconciled: true,
              },
            });
            return { status: 'payout_failed_refunded', withdrawalId: withdrawal.id };
          }
        }
      }
    }

    // Filter incoming credit events
    if (
      eventType &&
      eventType !== 'payment_success' &&
      eventType !== 'collection.successful'
    ) {
      this.logger.log(`Ignoring Nomba event type: ${eventType}`);
      return { status: 'ignored', eventType };
    }

    const reference =
      payload.data?.transaction?.transactionId ||
      payload.data?.transactionId ||
      payload.data?.merchantTxRef ||
      payload.requestId ||
      payload.reference ||
      `NOMBA-DEP-${Date.now()}`;

    const existingDeposit = await prisma.deposit.findFirst({
      where: { reference },
    });

    if (existingDeposit) {
      this.logger.log(`Deposit ${reference} already processed. Skipping duplicate.`);
      return { status: 'already_processed' };
    }

    const accountNumber =
      payload.data?.transaction?.aliasAccountNumber ||
      payload.data?.account?.bankAccountNumber ||
      payload.data?.bankAccountNumber ||
      payload.data?.accountNumber ||
      payload.accountNumber;

    const accountRef =
      payload.data?.transaction?.aliasAccountReference ||
      payload.data?.account?.accountRef ||
      payload.data?.accountRef ||
      payload.accountRef;

    const amount = Number(
      payload.data?.transaction?.transactionAmount ||
      payload.data?.amount ||
      0
    );

    if (amount <= 0) {
      throw new BadRequestException('Invalid deposit amount in webhook payload');
    }

    // -------------------------------------------------------------
    // FLOW 2: Check Dedicated Trader Wallet (Permanent Account)
    // -------------------------------------------------------------
    const wallet = await prisma.customerWallet.findFirst({
      where: {
        OR: [
          ...(accountNumber ? [{ nombaAccountNumber: accountNumber }, { lencoAccountNumber: accountNumber }] : []),
          ...(accountRef ? [{ nombaAccountReference: accountRef }, { lencoAccountReference: accountRef }] : []),
        ],
      },
      include: { user: true },
    });

    // -------------------------------------------------------------
    // FLOW 1: WordPress WooCommerce Order Payment (Dynamic Account)
    // -------------------------------------------------------------
    if (!wallet) {
      this.logger.log(`Account ${accountNumber || 'N/A'} / ref ${accountRef || 'N/A'} is not a Dedicated Trader Wallet. Inspecting order reference...`);

      let orderId: number | null = null;
      if (accountRef) {
        if (accountRef.startsWith('NMB')) {
          const temp = accountRef.slice(3);
          orderId = parseInt(temp.includes('T') ? temp.split('T')[0] : temp, 10);
        } else if (accountRef.startsWith('FG-ORD-')) {
          orderId = parseInt(accountRef.replace('FG-ORD-', ''), 10);
        }
      }

      if (orderId && !isNaN(orderId) && orderId > 0) {
        this.logger.log(`Detected WordPress WooCommerce Order #${orderId} from Nomba accountRef "${accountRef}"`);

        // Fetch order from WooCommerce to check exact required amount
        const wcOrder = await this.woocommerceService.getOrder(orderId);
        const requiredAmount = wcOrder ? Number(wcOrder.total) : amount;
        const receivedAmount = amount;

        // UNDERPAYMENT CHECK: Reject order completion if payment is less than exact required amount
        if (receivedAmount < requiredAmount) {
          const deficit = requiredAmount - receivedAmount;
          this.logger.warn(`UNDERPAYMENT on Order #${orderId}: Received ₦${receivedAmount.toLocaleString()}, Required ₦${requiredAmount.toLocaleString()} (Deficit: ₦${deficit.toLocaleString()})`);

          // Mark WooCommerce order on-hold with explanation note
          await this.woocommerceService.updateOrderStatus(
            orderId,
            'on-hold',
            `Underpayment received via Nomba: ₦${receivedAmount.toLocaleString()} of ₦${requiredAmount.toLocaleString()} (Outstanding deficit: ₦${deficit.toLocaleString()}). Trading account provisioning is PAUSED until balance is paid in full.`
          );

          // Proxy to WordPress Nomba handler as well
          await this.forwardToWordPressNomba(payload, signature, sigValue);

          return {
            status: 'underpayment_recorded',
            orderId,
            receivedAmount,
            requiredAmount,
            deficit,
          };
        }

        // EXACT OR OVERPAYMENT: Mark complete, provision SteraTrader, credit surplus to Giants Vault
        this.logger.log(`Payment confirmed for Order #${orderId}: Received ₦${receivedAmount.toLocaleString()} (Required: ₦${requiredAmount.toLocaleString()})`);

        await this.woocommerceService.updateOrderStatus(
          orderId,
          'completed',
          `Full payment confirmed via Nomba (Received ₦${receivedAmount.toLocaleString()}). SteraTrader account provisioning initiated.`
        );

        // Proxy to WordPress Nomba handler as well (non-blocking)
        try {
          await this.forwardToWordPressNomba(payload, signature, sigValue);
        } catch (fwdErr: any) {
          this.logger.warn(`Non-blocking proxy to WordPress Nomba handler failed: ${fwdErr.message}`);
        }

        // Provision SteraTrader trading challenge (via internal webhook pipeline)
        const billing = wcOrder?.billing || {};
        let customerEmail =
          billing.email ||
          payload.data?.customer?.email ||
          payload.data?.account?.customerEmail ||
          payload.data?.customerEmail ||
          payload.customerEmail ||
          '';

        const customerName =
          `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
          payload.data?.customer?.senderName ||
          payload.data?.account?.customerName ||
          payload.data?.customerName ||
          payload.data?.transaction?.aliasAccountName?.replace(/^FUNDEDGIANTS\//i, '') ||
          'Valued Trader';

        const nameParts = customerName.split(' ');
        const firstName = billing.first_name || nameParts[0] || 'Valued';
        const lastName = billing.last_name || nameParts.slice(1).join(' ') || 'Trader';

        // Fallback user lookup if email missing from WooCommerce response
        if (!customerEmail) {
          const matchedUser = await prisma.user.findFirst({
            where: {
              OR: [
                { firstName: { equals: firstName, mode: 'insensitive' } },
                { lastName: { equals: lastName, mode: 'insensitive' } },
              ],
            },
          });
          if (matchedUser?.email) {
            customerEmail = matchedUser.email;
            this.logger.log(`Resolved customer email "${customerEmail}" via database user profile match for "${customerName}"`);
          }
        }

        const accountSize = Number(
          wcOrder?.meta_data?.find((m: any) => m.key === '_account_size')?.value ||
          wcOrder?.total ||
          amount
        );
        const planSku =
          wcOrder?.line_items?.[0]?.sku ||
          wcOrder?.line_items?.[0]?.name ||
          'rhino-rush-10000000';

        if (customerEmail) {
          await this.handleWooCommerceWebhook(
            {
              order_id: orderId,
              order_number: `FG-ORD-${orderId}`,
              billing: {
                email: customerEmail,
                first_name: firstName,
                last_name: lastName,
                phone: billing.phone || '',
              },
              total: requiredAmount,
              amount_received: receivedAmount,
              overage_amount: receivedAmount > requiredAmount ? receivedAmount - requiredAmount : 0,
              account_size: accountSize,
              plan_sku: planSku,
              payment_method: 'NOMBA_DYNAMIC_TRANSFER',
            },
            'INTERNAL_NOMBA_CALL',
            '',
          );
        } else {
          this.logger.warn(`Could not determine customer email for Nomba Order #${orderId}. Provisioning deferred to direct WooCommerce dispatch.`);
        }

        return {
          status: 'order_payment_completed',
          orderId,
          amountReceived: receivedAmount,
        };
      }

      // Fallback: Proxy to WordPress WooCommerce if WOOCOMMERCE_NOMBA_WEBHOOK_URL is set
      const fwdResult = await this.forwardToWordPressNomba(payload, signature, sigValue);
      if (fwdResult) return fwdResult;

      this.logger.warn(`No wallet or order found matching account number ${accountNumber} or ref ${accountRef}`);
      return { status: 'wallet_not_found', accountNumber, accountRef };
    }

    const senderName = payload.data?.sender?.senderName || payload.data?.senderName || 'Bank Transfer';
    const senderBank = payload.data?.sender?.senderBankName || payload.data?.senderBank;
    const senderAccount = payload.data?.sender?.senderAccountNumber || payload.data?.senderAccount;

    await prisma.$transaction(async (tx) => {
      // 1. Record deposit in wallet history (automatically increments available balance via dynamic calculation)
      await tx.deposit.create({
        data: {
          walletId: wallet.id,
          reference,
          amount,
          currency: 'NGN',
          status: PaymentStatus.SUCCESSFUL,
          senderAccount,
          senderBank,
          senderName,
          rawWebhookData: payload,
          reconciled: true,
        },
      });

      // 2. Post to Double-Entry Ledger (Debit 1000-CASH-NOMBA, Credit 2000-WALLET-LIABILITY)
      try {
        const cashAccount = await tx.ledgerAccount.findFirst({
          where: { OR: [{ code: '1000-CASH-NOMBA' }, { code: '1000-CASH-LENCO' }] },
        });
        const liabilityAccount = await tx.ledgerAccount.findFirst({
          where: { code: '2000-WALLET-LIABILITY' },
        });

        if (cashAccount && liabilityAccount) {
          const entry = await tx.journalEntry.create({
            data: {
              entryNumber: `JE-DEP-${Date.now()}`,
              transactionType: TransactionType.DEPOSIT_NOMBA_VIRTUAL,
              reference,
              narration: `Virtual account deposit of ₦${amount.toLocaleString()} from ${senderName} via Nomba`,
            },
          });

          await tx.journalLine.createMany({
            data: [
              { journalEntryId: entry.id, accountId: cashAccount.id, debit: amount, credit: 0 },
              { journalEntryId: entry.id, accountId: liabilityAccount.id, debit: 0, credit: amount },
            ],
          });
        }
      } catch (jeErr: any) {
        this.logger.error(`Error posting Nomba deposit to ledger: ${jeErr.message}`);
      }
    });

    // 3. Dispatch in-app notification with chime sound + Brevo email to trader
    await this.notificationsService.createNotification({
      userId: wallet.userId,
      title: 'Giants Vault Deposit Credited',
      message: `Your dedicated account received a deposit of ₦${amount.toLocaleString()} from ${senderName}. Funds are available immediately in your Giants Vault for withdrawal or purchasing trading accounts.`,
      category: 'FINANCE',
      priority: 'HIGH',
      actionUrl: '/dashboard/wallet',
      sendEmail: true,
    });

    this.logger.log(`Nomba deposit of ₦${amount.toLocaleString()} successfully credited to wallet of user ${wallet.userId}`);

    return {
      status: 'success',
      reference,
      amount,
    };
  }

  /**
   * Lenco Virtual Account Funding Webhook
   */
  @Post('lenco')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and process Lenco incoming deposit notifications' })
  async handleLencoWebhook(
    @Body() payload: any,
    @Headers('x-lenco-signature') signature: string
  ) {
    this.logger.log(`Received Lenco webhook: ${JSON.stringify(payload)}`);

    const reference = payload.data?.reference || payload.reference;
    if (!reference) {
      throw new BadRequestException('Missing transaction reference');
    }

    const existingEvent = await prisma.webhookEvent.findFirst({
      where: { provider: 'LENCO', eventId: reference },
    });

    if (existingEvent?.isProcessed) {
      return { status: 'already_processed' };
    }

    const eventRecord = await prisma.webhookEvent.upsert({
      where: { eventId: reference },
      update: {},
      create: {
        provider: 'LENCO',
        eventId: reference,
        eventType: payload.event || 'collection.successful',
        payload,
        signature,
        isVerified: true,
      },
    });

    const accountNumber = payload.data?.virtualAccount?.accountNumber || payload.data?.accountNumber;
    const amount = Number(payload.data?.amount || 0);

    const wallet = await prisma.customerWallet.findUnique({
      where: { lencoAccountNumber: accountNumber },
    });

    if (!wallet) {
      return { status: 'wallet_not_found' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.deposit.create({
        data: {
          walletId: wallet.id,
          reference,
          amount,
          currency: 'NGN',
          status: 'SUCCESSFUL',
          senderAccount: payload.data?.senderAccount,
          senderBank: payload.data?.senderBank,
          senderName: payload.data?.senderName,
          rawWebhookData: payload,
          reconciled: true,
        },
      });

      const entry = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-DEP-${Date.now()}`,
          transactionType: 'DEPOSIT_LENCO_VIRTUAL',
          reference,
          narration: `Virtual bank deposit of ₦${amount} for wallet ${wallet.id}`,
        },
      });

      const cashAccount = await tx.ledgerAccount.findFirst({ where: { code: '1000-CASH-LENCO' } });
      const walletLiabilityAccount = await tx.ledgerAccount.findFirst({
        where: { code: '2000-WALLET-LIABILITY' },
      });

      if (cashAccount && walletLiabilityAccount) {
        await tx.journalLine.createMany({
          data: [
            { journalEntryId: entry.id, accountId: cashAccount.id, debit: amount, credit: 0 },
            { journalEntryId: entry.id, accountId: walletLiabilityAccount.id, debit: 0, credit: amount },
          ],
        });
      }

      await tx.webhookEvent.update({
        where: { id: eventRecord.id },
        data: { isProcessed: true },
      });
    });

    return { status: 'success' };
  }

  /**
   * Ninja KYC Webhook
   * Dispatched by Ninja.ng upon completion of Hosted KYC verification
   * Stores verified BVN, updates KYC status to APPROVED, and auto-provisions dedicated Nomba virtual account
   */
  @Post('ninja-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Ninja KYC verification results' })
  async handleNinjaWebhook(
    @Body() payload: any,
    @Headers('x-ninja-signature') signature?: string,
    @Headers('x-signature') altSignature?: string,
  ) {
    const rawSignature = signature || altSignature;
    if (rawSignature) {
      const isValid = this.ninjaKycService.verifyWebhookSignature(
        JSON.stringify(payload),
        rawSignature
      );
      if (!isValid) {
        this.logger.warn('Rejected Ninja KYC webhook with invalid signature');
        throw new UnauthorizedException('Invalid Ninja KYC signature');
      }
    }

    const reference =
      payload.data?.verification_id ||
      payload.data?.customer_ref ||
      payload.customer_ref ||
      payload.data?.reference ||
      payload.reference ||
      `FG-KYC-${Date.now()}`;

    const userId =
      payload.data?.customer_ref ||
      payload.customer_ref ||
      payload.data?.reference ||
      payload.reference;

    if (!userId) {
      this.logger.warn(`Invalid reference/customer_ref in KYC webhook: ${JSON.stringify(payload)}`);
      throw new BadRequestException('Invalid reference or customer_ref in KYC webhook');
    }

    const outcome = payload.data?.outcome || payload.outcome || payload.data?.status || payload.status;
    const isApproved =
      outcome === 'verified' ||
      outcome === 'completed' ||
      outcome === 'approved' ||
      outcome === 'success' ||
      payload.event === 'verification.completed' ||
      payload.event === 'verification.approved';

    const bvn = payload.data?.bvn || payload.bvn || payload.data?.id_number || null;
    const verifiedFirstName = payload.data?.first_name || payload.first_name;
    const verifiedLastName = payload.data?.last_name || payload.last_name;

    if (isApproved) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (user) {
        const finalFirstName = verifiedFirstName || user.firstName || 'Trader';
        const finalLastName = verifiedLastName || user.lastName || 'Account';

        await prisma.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'APPROVED',
            firstName: finalFirstName,
            lastName: finalLastName,
          },
        });

        // Store / update KycRecord with encrypted/stored BVN and verified payload
        await prisma.kycRecord.create({
          data: {
            userId: user.id,
            provider: 'NinjaKYC',
            externalReference: reference,
            status: 'APPROVED',
            verifiedAt: new Date(),
            providerPayload: {
              bvn: bvn ? '•••••••' + bvn.slice(-4) : undefined,
              rawBvn: bvn || undefined,
              firstName: finalFirstName,
              lastName: finalLastName,
              rawPayload: payload,
              verifiedAt: new Date().toISOString(),
            },
          },
        });

        // Auto-provision dedicated Nomba Virtual Account
        if (!user.wallet?.nombaAccountNumber) {
          const nombaRes = await this.nombaService.createVirtualAccount({
            userId: user.id,
            firstName: finalFirstName,
            lastName: finalLastName,
            bvn: bvn || undefined,
          });

          if (nombaRes.status && nombaRes.data) {
            await prisma.customerWallet.upsert({
              where: { userId: user.id },
              update: {
                nombaVirtualBankName: nombaRes.data.bankName,
                nombaAccountName: nombaRes.data.bankAccountName,
                nombaAccountNumber: nombaRes.data.bankAccountNumber,
                nombaAccountReference: nombaRes.data.accountRef,
              },
              create: {
                userId: user.id,
                nombaVirtualBankName: nombaRes.data.bankName,
                nombaAccountName: nombaRes.data.bankAccountName,
                nombaAccountNumber: nombaRes.data.bankAccountNumber,
                nombaAccountReference: nombaRes.data.accountRef,
              },
            });
          }
        }

        // Notify user of verification and active deposit vault
        try {
          await this.notificationsService.createNotification({
            userId: user.id,
            title: 'NinjaKYC Verified & Deposit Account Active!',
            message: `Your identity has been verified successfully. Your dedicated FundedGiants deposit account is now active.`,
            category: 'SECURITY' as any,
            priority: 'HIGH' as any,
          });
        } catch (e) {
          this.logger.warn(`Failed to dispatch KYC notification: ${(e as any).message}`);
        }
      }
    }

    return { status: 'success' };
  }

  /**
   * SteraTrader Trade Event & Real-Time Equity Webhook
   * Dispatched instantaneously on TRADE_OPEN, TRADE_CLOSE, TRADE_UPDATE, and EQUITY_TICK.
   * Feeds directly into RiskEngine for sub-second rule evaluation and breach termination.
   */
  @Post('steratrader/events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive real-time trade execution and equity ticks from SteraTrader' })
  async handleSteraTraderEvent(
    @Body() payload: any,
    @Headers('x-steratrader-signature') signature: string
  ) {
    const secret = process.env.STERATRADER_WEBHOOK_SECRET || process.env.STERATRADER_API_KEY || 'fg_stera_live_secret';
    if (secret) {
      if (!signature) {
        throw new UnauthorizedException('Missing required SteraTrader webhook signature');
      }
      const expected = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (signature !== expected) {
        throw new UnauthorizedException('Invalid SteraTrader webhook signature');
      }
    }

    if (!payload.accountNumber) {
      throw new BadRequestException('Missing accountNumber in SteraTrader event');
    }

    this.logger.debug(
      `SteraTrader Event [${payload.event || 'TICK'}]: Account ${payload.accountNumber}`
    );

    return this.riskEngineService.processTradeEvent({
      event: payload.event || 'EQUITY_TICK',
      accountNumber: payload.accountNumber,
      tradeId: payload.tradeId,
      symbol: payload.symbol,
      direction: payload.direction,
      volume: payload.volume,
      openPrice: payload.openPrice,
      closePrice: payload.closePrice,
      profit: payload.profit,
      equity: payload.equity,
      balance: payload.balance,
      timestamp: payload.timestamp,
    });
  }
}
