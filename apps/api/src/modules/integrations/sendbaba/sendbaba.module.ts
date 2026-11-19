import { Module } from '@nestjs/common';
import { SendbabaService } from './sendbaba.service';
import { SendbabaController } from './sendbaba.controller';

@Module({
  controllers: [SendbabaController],
  providers: [SendbabaService],
  exports: [SendbabaService],
})
export class SendbabaModule {}
