import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineController } from './risk-engine.controller';
import { TradeRouterService } from './trade-router.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { CertificatesModule } from '../certificates/certificates.module';
import { WooCommerceModule } from '../integrations/woocommerce/woocommerce.module';

@Module({
  imports: [ScheduleModule.forRoot(), CertificatesModule, WooCommerceModule],
  controllers: [RiskEngineController],
  providers: [RiskEngineService, TradeRouterService, SteraTraderService],
  exports: [RiskEngineService, TradeRouterService],
})
export class RiskEngineModule {}