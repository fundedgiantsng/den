import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RobaseService } from '../integrations/robase/robase.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, RobaseService],
  exports: [AuthService],
})
export class AuthModule {}
