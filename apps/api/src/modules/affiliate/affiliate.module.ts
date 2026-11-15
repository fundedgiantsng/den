import { Module } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { AffiliateController } from './affiliate.controller';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';

@Module({
  controllers: [AffiliateController],
  providers: [AffiliateService, WooCommerceService],
  exports: [AffiliateService],
})
export class AffiliateModule {}
