import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';

@Controller('affiliates')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    return this.affiliateService.getOrCreateProfile(userId);
  }

  @Post('discount-share')
  async updateDiscountShare(@Req() req: any, @Body() body: { discountPercent: number }) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    return this.affiliateService.updateDiscountShare(userId, Number(body.discountPercent));
  }

  @Post('transfer-to-vault')
  async transferToVault(@Req() req: any, @Body() body: { amountNgn?: number }) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    return this.affiliateService.transferCommissionToVault(userId, body.amountNgn);
  }
}
