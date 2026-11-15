import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AdminModule } from './modules/admin/admin.module';
import { RiskEngineModule } from './modules/risk/risk-engine.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CardsModule } from './modules/cards/cards.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    WebhooksModule,
    ChallengesModule,
    RiskEngineModule,
    AffiliateModule,
    WalletModule,
    CertificatesModule,
    CardsModule,
    AdminModule,
  ],
  controllers: [],
})
export class AppModule {}
