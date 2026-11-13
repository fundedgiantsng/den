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
import { PurchaseFromWalletDto } from './dto/purchase.dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available challenge plans, account sizes, and prices' })
  getPlans() {
    return this.challengesService.getAvailablePlans();
  }

  @Post('purchase-from-wallet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase challenge directly from user NGN wallet balance' })
  async purchaseFromWallet(@Body() dto: PurchaseFromWalletDto, @Req() req: Request) {
    // Extract session from cookie or authorization header
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      // For development / local demo fallback to first customer if no cookie set
      const demoUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
      if (!demoUser) throw new UnauthorizedException('Authentication required');
      return this.challengesService.purchaseFromWallet(demoUser.id, dto);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return this.challengesService.purchaseFromWallet(session.user.id, dto);
  }
}
