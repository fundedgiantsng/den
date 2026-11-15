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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthService } from '../auth/auth.service';
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Dispatch broadcast notification & email to traders' })
  async createBroadcast(@Body() dto: CreateBroadcastDto) {
    return this.notificationsService.createBroadcastNotification(dto);
  }

  @Get('admin/broadcasts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: List broadcast history' })
  async getBroadcasts() {
    const broadcasts = await this.notificationsService.getBroadcastHistory();
    return {
      success: true,
      data: broadcasts,
    };
  }
}
