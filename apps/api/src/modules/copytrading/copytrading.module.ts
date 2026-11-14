import { Module } from '@nestjs/common';
import { CopyTradingService } from './copytrading.service';
import { CopyTradingController } from './copytrading.controller';

@Module({
  controllers: [CopyTradingController],
  providers: [CopyTradingService],
  exports: [CopyTradingService],
})
export class CopyTradingModule {}
