import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthService } from '../auth/auth.service';
import { DeviceBindingGuard } from '../admin/device-binding.guard';
import { CreateBroadcastDto } from './dto/notifications.dto';
import { NotificationCategory } from '@fundedgiants/database';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService,
  ) {}

  private async getSessionUserOrThrow(req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    return user;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user in-app notifications' })
  async getNotifications(
    @Req() req: any,
    @Query('isRead') isRead?: string,
    @Query('category') category?: NotificationCategory,
  ) {
    const user = await this.getSessionUserOrThrow(req);
    const filter: any = {};
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (category) filter.category = category;

    const notifications = await this.notificationsService.getUserNotifications(user.id, filter);
    return {
      success: true,
      data: notifications,
    };
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user notification channel preferences' })
  async getPreferences(@Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const prefs = await this.notificationsService.getNotificationPreferences(user.id);
    return {
      success: true,
      data: prefs,
    };
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification channel preferences' })
  async updatePreferences(@Req() req: any, @Body() body: any) {
    const user = await this.getSessionUserOrThrow(req);
    const updated = await this.notificationsService.updateNotificationPreferences(user.id, body);
    return {
      success: true,
      data: updated,
    };
  }

  @Get('accrued-fees')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get accrued notification fees for the current month' })
  async getAccruedFees(@Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const accrued = await this.notificationsService.getAccruedMonthlyFees(user.id);
    return {
      success: true,
      data: accrued,
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    await this.notificationsService.markAsRead(id, user.id);
    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ================= ADMIN ENDPOINTS ================= //

  @Post('admin/broadcast')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Dispatch broadcast notification & email to traders' })
  async createBroadcast(@Body() dto: CreateBroadcastDto) {
    return this.notificationsService.createBroadcastNotification(dto);
  }

  @Get('admin/broadcasts')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: List broadcast history' })
  async getBroadcasts() {
    const broadcasts = await this.notificationsService.getBroadcastHistory();
    return {
      success: true,
      data: broadcasts,
    };
  }

  @Post('admin/settle-monthly-fees')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Manually trigger monthly notification fee settlement' })
  async triggerMonthlyFeeSettlement(@Body('targetMonth') targetMonth?: string) {
    const results = await this.notificationsService.settleMonthlyNotificationFees(targetMonth);
    return {
      success: true,
      data: results,
    };
  }
}
