import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { SteraTraderService } from '../integrations/steratrader/steratrader.service';

@Module({
  controllers: [ChallengesController],
  providers: [ChallengesService, SteraTraderService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
