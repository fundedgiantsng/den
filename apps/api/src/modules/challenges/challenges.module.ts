import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';
import { RiskEngineModule } from '../risk/risk-engine.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [RiskEngineModule, CertificatesModule],
  controllers: [ChallengesController],
  providers: [ChallengesService, SteraTraderService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
