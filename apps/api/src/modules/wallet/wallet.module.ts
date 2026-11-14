import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { LencoService } from '../integrations/lenco/lenco.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, LencoService],
  exports: [WalletService],
})
export class WalletModule {}
