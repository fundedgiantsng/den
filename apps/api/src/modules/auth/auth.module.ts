import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RobaseService } from '../integrations/robase/robase.service';
import { NinjaKycService } from '../integrations/ninja/ninja.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, RobaseService, NinjaKycService],
  exports: [AuthService],
})
export class AuthModule {}
