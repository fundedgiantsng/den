import { Controller, Get, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';
import { AffiliateService } from './affiliate.service';

@ApiTags('Affiliate')
@Controller('affiliates')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user affiliate profile, referral metrics and discount codes' })
  async getProfile(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.affiliateService.getOrCreateProfile(userId);
  }

  @Post('custom-code')
  @ApiOperation({ summary: 'Create a sitewide unique custom discount code with user limit' })
  async createCustomCode(
    @Req() req: Request,
    @Body() body: { code: string; discountPercent: number; maxUsage: number }
  ) {
    const userId = await this.resolveUserId(req);
    return this.affiliateService.createCustomDiscountCode({
      userId,
      code: body.code,
      discountPercent: body.discountPercent,
      maxUsage: body.maxUsage,
    });
  }

  @Get('my-codes')
  @ApiOperation({ summary: 'Get all custom discount codes created by this affiliate' })
  async getMyCodes(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.affiliateService.getMyDiscountCodes(userId);
  }

  @Post('discount-share')
  @ApiOperation({ summary: 'Update default referral discount share percentage' })
  async updateDiscountShare(@Req() req: Request, @Body() body: { discountPercent: number }) {
    const userId = await this.resolveUserId(req);
    return this.affiliateService.updateDiscountShare(userId, Number(body.discountPercent));
  }

  @Post('transfer-to-vault')
  @ApiOperation({ summary: 'Transfer earned affiliate commission to Giants Vault balance' })
  async transferToVault(@Req() req: Request, @Body() body: { amountNgn?: number }) {
    const userId = await this.resolveUserId(req);
    return this.affiliateService.transferCommissionToVault(userId, body.amountNgn);
  }

  private async resolveUserId(req: Request): Promise<string> {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
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
