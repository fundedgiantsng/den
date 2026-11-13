import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { prisma } from '@fundedgiants/database';
import { LencoService } from '../integrations/lenco/lenco.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly lencoService: LencoService,
    private readonly ninjaKycService: NinjaKycService
  ) {}

  /**
   * Lenco Virtual Account Funding Webhook
   * Automatically credits user wallet upon money received
   * https://lenco-api.readme.io/reference/webhooks
   */
  @Post('lenco')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and process Lenco incoming deposit notifications' })
  async handleLencoWebhook(
    @Body() payload: any,
    @Headers('x-lenco-signature') signature: string
  ) {
    this.logger.log(`Received Lenco webhook: ${JSON.stringify(payload)}`);

    // Record webhook event idempotently
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

    // Check virtual account and bind to wallet
    const accountNumber = payload.data?.virtualAccount?.accountNumber || payload.data?.accountNumber;
    const amount = Number(payload.data?.amount || 0);

    const wallet = await prisma.customerWallet.findUnique({
      where: { lencoAccountNumber: accountNumber },
    });

    if (!wallet) {
      this.logger.error(`No matching wallet found for virtual account: ${accountNumber}`);
      return { status: 'wallet_not_found' };
    }

    // Atomic double-entry deposit record
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

      // Post to Double-Entry Ledger
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-DEP-${Date.now()}`,
          transactionType: 'DEPOSIT_LENCO_VIRTUAL',
          reference,
          narration: `Virtual bank deposit of ₦${amount} for wallet ${wallet.id}`,
        },
      });

      // Fetch Ledger Accounts
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

    this.logger.log(`Wallet ${wallet.id} successfully credited with ₦${amount}`);
    return { status: 'success' };
  }

  /**
   * Ninja KYC Webhook
   * On KYC approved: triggers Lenco dedicated virtual account creation
   */
  @Post('ninja-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Ninja KYC verification results' })
  async handleNinjaWebhook(@Body() payload: any) {
    this.logger.log(`Received Ninja KYC webhook: ${JSON.stringify(payload)}`);

    const reference = payload.data?.reference || payload.reference;
    // Format: FG-KYC-{userId}
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
        // Update user status
        await prisma.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'APPROVED',
            firstName: payload.data?.first_name || user.firstName,
            lastName: payload.data?.last_name || user.lastName,
          },
        });

        // Trigger Lenco dedicated virtual account creation if not yet assigned
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
            this.logger.log(`Assigned Lenco Virtual Account to ${user.id}: ${lencoRes.data.accountNumber}`);
          }
        }
      }
    }

    return { status: 'success' };
  }
}
