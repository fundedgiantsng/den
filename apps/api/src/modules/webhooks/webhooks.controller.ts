import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { prisma, PaymentStatus, TransactionType } from '@fundedgiants/database';
import { LencoService } from '../integrations/lenco/lenco.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';
import { RiskEngineService } from '../risk/risk-engine.service';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
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
    if (payload?.payload && typeof payload.payload === 'string') {
      const decrypted = this.woocommerceService.decryptPayload(payload.payload);
      if (decrypted) {
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

    // 2. Verify webhook signature if provided
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'fg_live_webhook_secret_key';
    const activeSignature = signature || wcSignature;
    if (activeSignature) {
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (activeSignature !== computedSignature) {
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

        await prisma.tradingAccount.create({
          data: {
            accountNumber: steraRes.login,
            userId: user.id,
            challengeId: challenge.id,
            platform: 'SteraTrader',
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

    // 8. Dispatch Account Ready Notification with SteraTrader details
    await this.notificationsService.createNotification({
      userId: user.id,
      title: `Your ${planType === 'phoenix-rise' ? 'Phoenix Rise' : 'Rhino Rush'} Account is Ready!`,
      message: `Your ${planType === 'phoenix-rise' ? 'Phoenix Rise' : 'Rhino Rush'} trading account (#${provisionedLogin || challengeNumber}) has been provisioned on SteraTrader with starting balance of ₦${accountSizeNgn.toLocaleString()}.${surplusCredited > 0 ? ` Additionally, your surplus payment of ₦${surplusCredited.toLocaleString()} was credited to your Giants Vault balance.` : ''}`,
      category: 'TRADING',
      priority: 'HIGH',
      actionUrl: '/dashboard/trading-accounts',
      sendEmail: true,
    });

    return {
      status: 'success',
      orderNumber,
      challengeNumber,
      steraLogin: provisionedLogin,
      surplusCredited,
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
   */
  @Post('ninja-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Ninja KYC verification results' })
  async handleNinjaWebhook(@Body() payload: any) {
    const reference = payload.data?.reference || payload.reference;
    const userId = reference?.replace('FG-KYC-', '');

    if (!userId) {
      throw new BadRequestException('Invalid reference in KYC webhook');
    }

    const isApproved = payload.event === 'verification.approved' || payload.data?.status === 'approved';

    if (isApproved) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'APPROVED',
            firstName: payload.data?.first_name || user.firstName,
            lastName: payload.data?.last_name || user.lastName,
          },
        });

        if (!user.wallet?.lencoAccountNumber) {
          const lencoRes = await this.lencoService.createVirtualAccount({
            userId: user.id,
            firstName: user.firstName || payload.data?.first_name || 'Trader',
            lastName: user.lastName || payload.data?.last_name || user.id.slice(0, 5),
            bvn: payload.data?.bvn,
          });

          if (lencoRes.status && lencoRes.data) {
            await prisma.customerWallet.upsert({
              where: { userId: user.id },
              update: {
                lencoVirtualBankName: lencoRes.data.bankName,
                lencoAccountName: lencoRes.data.accountName,
                lencoAccountNumber: lencoRes.data.accountNumber,
                lencoAccountReference: lencoRes.data.reference,
              },
              create: {
                userId: user.id,
                lencoVirtualBankName: lencoRes.data.bankName,
                lencoAccountName: lencoRes.data.accountName,
                lencoAccountNumber: lencoRes.data.accountNumber,
                lencoAccountReference: lencoRes.data.reference,
              },
            });
          }
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
    const secret = process.env.STERATRADER_WEBHOOK_SECRET || 'fg_stera_live_secret';
    if (signature) {
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
