import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportAiService } from './support-ai.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SupportController],
  providers: [SupportService, SupportAiService],
  exports: [SupportService, SupportAiService],
})
export class SupportModule {}

