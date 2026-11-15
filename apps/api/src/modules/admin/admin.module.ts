import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminConfigController } from './admin-config.controller';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { LencoService } from '../integrations/lenco/lenco.service';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';

@Module({
  controllers: [AdminController, AdminConfigController],
  providers: [AdminService, SteraTraderService, LencoService, WooCommerceService],
  exports: [AdminService],
})
export class AdminModule {}
