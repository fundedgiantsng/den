import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineController } from './risk-engine.controller';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RiskEngineController],
  providers: [RiskEngineService, SteraTraderService],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
