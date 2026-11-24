import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get live wallet overview, balances and banking info' })
  async getOverview(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.walletService.getWalletOverview(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get live user wallet transactions from ledger' })
  async getTransactions(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.walletService.getTransactions(userId);
  }

  @Get('banks')
  @ApiOperation({ summary: 'List verified Nigerian commercial banks and fintechs' })
  getBanks() {
    return this.walletService.getNigerianBanks();
  }

  @Get('resolve-bank-account')
  @ApiOperation({ summary: 'Automatically lookup Nigerian bank account name and check KYC name match' })
  async resolveBankAccount(
    @Query('accountNumber') accountNumber: string,
    @Query('bankCode') bankCode: string,
    @Req() req: Request
  ) {
    const userId = await this.resolveUserId(req);
    return this.walletService.resolveBankAccount({
      userId,
      accountNumber,
      bankCode,
    });
  }

  @Post('bind-bank-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bind a verified withdrawal bank account (must match KYC name)' })
  async bindBankAccount(
    @Body() body: { bankCode: string; bankName: string; accountNumber: string },
    @Req() req: Request
  ) {
    const userId = await this.resolveUserId(req);
    return this.walletService.bindBankAccount({
      userId,
      bankCode: body.bankCode,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
    });
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request profit or balance withdrawal to bound bank account' })
  async withdraw(
    @Body() body: { bankAccountId: string; amountNgn: number },
    @Req() req: Request
  ) {
    const userId = await this.resolveUserId(req);
    return this.walletService.requestWithdrawal({
      userId,
      bankAccountId: body.bankAccountId,
      amountNgn: body.amountNgn,
    });
  }

  private async resolveUserId(req: Request): Promise<string> {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return session.user.id;
  }
}
