import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { NombaService } from '../integrations/nomba/nomba.service';
import { LencoService } from '../integrations/lenco/lenco.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, NombaService, LencoService],
  exports: [WalletService],
})
export class WalletModule {}
