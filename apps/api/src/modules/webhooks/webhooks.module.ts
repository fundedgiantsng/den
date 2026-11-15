import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { LencoService } from '../integrations/lenco/lenco.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { WooCommerceModule } from '../integrations/woocommerce/woocommerce.module';
import { RiskEngineModule } from '../risk/risk-engine.module';

@Module({
  imports: [RiskEngineModule, WooCommerceModule],
  controllers: [WebhooksController],
  providers: [LencoService, NinjaKycService, SteraTraderService],
  exports: [LencoService, NinjaKycService, SteraTraderService],
})
export class WebhooksModule {}