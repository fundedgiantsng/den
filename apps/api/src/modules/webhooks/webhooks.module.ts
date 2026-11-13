import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { LencoService } from '../integrations/lenco/lenco.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';

@Module({
  controllers: [WebhooksController],
  providers: [LencoService, NinjaKycService, SteraTraderService],
  exports: [LencoService, NinjaKycService, SteraTraderService],
})
export class WebhooksModule {}
