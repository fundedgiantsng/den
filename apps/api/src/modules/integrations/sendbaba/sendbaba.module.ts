import { Module } from '@nestjs/common';
import { SendbabaService } from './sendbaba.service';

@Module({
  providers: [SendbabaService],
  exports: [SendbabaService],
})
export class SendbabaModule {}
