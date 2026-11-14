import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';
import { ChallengesService } from './challenges.service';
import { PurchaseFromWalletDto, ValidateCouponsDto } from './dto/purchase.dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available challenge plans, account sizes, and prices' })
  getPlans() {
    return this.challengesService.getAvailablePlans();
  }

  @Post('validate-coupons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate site discount coupon and affiliate referral code' })
  validateCoupons(@Body() dto: ValidateCouponsDto) {
    return this.challengesService.validateCoupons(dto);
  }

  @Get('my-accounts')
  @ApiOperation({ summary: 'Get trading accounts and customer challenges for current user' })
  async getMyAccounts(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.challengesService.getUserAccounts(userId);
  }

  @Post('purchase-from-wallet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase challenge directly from user NGN wallet balance' })
  async purchaseFromWallet(@Body() dto: PurchaseFromWalletDto, @Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.challengesService.purchaseFromWallet(userId, dto);
  }

  private async resolveUserId(req: Request): Promise<string> {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      // Fallback for development/testing if no cookie set
      const demoUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
      if (!demoUser) throw new UnauthorizedException('Authentication required');
      return demoUser.id;
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
