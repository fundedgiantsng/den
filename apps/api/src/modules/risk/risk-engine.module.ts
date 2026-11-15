import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineController } from './risk-engine.controller';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { CertificatesModule } from '../certificates/certificates.module';
import { WooCommerceModule } from '../integrations/woocommerce/woocommerce.module';

@Module({
  imports: [ScheduleModule.forRoot(), CertificatesModule, WooCommerceModule],
  controllers: [RiskEngineController],
  providers: [RiskEngineService, SteraTraderService],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}