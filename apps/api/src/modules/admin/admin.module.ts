import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminConfigController } from './admin-config.controller';
import { AdminRecoveryController } from './admin-recovery.controller';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { NombaService } from '../integrations/nomba/nomba.service';
import { LencoService } from '../integrations/lenco/lenco.service';
import { WooCommerceService } from '../integrations/woocommerce/woocommerce.service';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  controllers: [AdminController, AdminConfigController, AdminRecoveryController],
  providers: [AdminService, SteraTraderService, NombaService, LencoService, WooCommerceService, NotificationsService],
  exports: [AdminService],
})
export class AdminModule {}
