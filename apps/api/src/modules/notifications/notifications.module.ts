import { Module, Global } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module';
import { SendbabaModule } from '../integrations/sendbaba/sendbaba.module';

@Global()
@Module({
  imports: [AuthModule, SendbabaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService, SendbabaModule],
})
export class NotificationsModule {}
