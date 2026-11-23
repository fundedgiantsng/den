import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AdminModule } from './modules/admin/admin.module';
import { RiskEngineModule } from './modules/risk/risk-engine.module';
import { AffiliateModule } from './modules/affiliate/affiliate.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CardsModule } from './modules/cards/cards.module';
import { SupportModule } from './modules/support/support.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SendbabaModule } from './modules/integrations/sendbaba/sendbaba.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
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
    SupportModule,
    NotificationsModule,
    AdminModule,
    SendbabaModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
