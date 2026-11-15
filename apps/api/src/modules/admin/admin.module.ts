import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminConfigController } from './admin-config.controller';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { LencoService } from '../integrations/lenco/lenco.service';

@Module({
  controllers: [AdminController, AdminConfigController],
  providers: [AdminService, SteraTraderService, LencoService],
  exports: [AdminService],
})
export class AdminModule {}
