import { Injectable, Logger } from '@nestjs/common';
import {
  prisma,
  NotificationCategory,
  NotificationPriority,
} from '@fundedgiants/database';
import { CreateNotificationDto, CreateBroadcastDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Helper to send branded email via Brevo transactional API
   */
  async sendEmail(toEmail: string, toName: string, subject: string, bodyText: string, actionUrl?: string) {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'support@fundedgiants.ng';
    const senderName = process.env.BREVO_SENDER_NAME || 'FundedGiants Operations';

    const fullActionUrl = actionUrl
      ? actionUrl.startsWith('http')
        ? actionUrl
        : `http://localhost:3000${actionUrl}`
      : 'http://localhost:3000/dashboard';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070a08; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #0c1610; border: 1px solid #1b3322; border-radius: 16px; overflow: hidden; }
            .header { padding: 24px; border-bottom: 1px solid #1b3322; background: #070e0a; text-align: center; }
            .content { padding: 32px 24px; }
            .title { font-size: 20px; font-weight: 800; color: #00f59b; margin-bottom: 12px; }
            .text { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
            .btn { display: inline-block; padding: 12px 28px; background: #00f59b; color: #000000; font-weight: 700; text-decoration: none; border-radius: 10px; font-size: 13px; }
            .footer { padding: 20px 24px; border-top: 1px solid #1b3322; background: #070e0a; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span style="font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">FUNDED<span style="color: #00f59b;">GIANTS</span></span>
            </div>
            <div class="content">
              <div class="title">${subject}</div>
              <div class="text">Hello ${toName || 'Valued Trader'},<br><br>${bodyText.replace(/\n/g, '<br>')}</div>
              <div style="text-align: center; margin-top: 24px;">
                <a href="${fullActionUrl}" class="btn">View in Dashboard</a>
              </div>
            </div>
            <div class="footer">
              FundedGiants Prop Trading • High Performance Proprietary Trading Firm<br>
              Direct Naira Denominated Accounts • SteraTrader Execution • Instant Daily Payouts
            </div>
          </div>
        </body>
      </html>
    `;

    if (brevoApiKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: toEmail, name: toName || 'Valued Trader' }],
            subject,
            htmlContent,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          this.logger.warn(`Brevo email dispatch failed for ${toEmail}: ${errText}`);
          return false;
        }
        return true;
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch email via Brevo: ${err.message}`);
        return false;
      }
    } else {
      this.logger.log(`[SIMULATED EMAIL DISPATCH] To: ${toEmail} | Subject: ${subject}`);
      return true;
    }
  }

  /**
   * Create an in-app notification and optionally dispatch email
   */
  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    actionUrl?: string;
    metadata?: any;
    sendEmail?: boolean;
  }) {
    const {
      userId,
      title,
      message,
      category = NotificationCategory.SYSTEM,
      priority = NotificationPriority.NORMAL,
      actionUrl,
      metadata,
      sendEmail = true,
    } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`Cannot create notification: user ${userId} not found`);
      return null;
    }

    let emailSent = false;
    if (sendEmail && user.email) {
      emailSent = await this.sendEmail(
        user.email,
        `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim(),
        title,
        message,
        actionUrl
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        category,
        priority,
        actionUrl,
        metadata,
        emailSent,
      },
    });

    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, filter?: { isRead?: boolean; category?: NotificationCategory }) {
    const where: any = { userId };
    if (filter?.isRead !== undefined) where.isRead = filter.isRead;
    if (filter?.category) where.category = filter.category;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, count: result.count };
  }

  /**
   * Admin: Dispatch Broadcast Notification to all or specific users
   */
  async createBroadcastNotification(dto: CreateBroadcastDto) {
    let targetUsers: { id: string; email: string | null; firstName: string | null; lastName: string | null }[] = [];

    if (dto.targetAudience === 'SPECIFIC_EMAILS' && dto.targetEmails) {
      const emailList = dto.targetEmails
        .split(/[\n,]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);

      targetUsers = await prisma.user.findMany({
        where: { email: { in: emailList } },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    } else {
      // All active users
      targetUsers = await prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    }

    const shouldSendEmail = dto.sendEmail !== false;

    // Create notifications for all target users in bulk
    const notificationData = targetUsers.map((user) => ({
      userId: user.id,
      title: dto.title.trim(),
      message: dto.message.trim(),
      category: dto.category || NotificationCategory.BROADCAST,
      priority: dto.priority || NotificationPriority.NORMAL,
      actionUrl: dto.actionUrl || null,
      emailSent: shouldSendEmail,
    }));

    if (notificationData.length > 0) {
      await prisma.notification.createMany({
        data: notificationData,
      });
    }

    // Dispatch emails if enabled
    if (shouldSendEmail) {
      for (const user of targetUsers) {
        if (user.email) {
          this.sendEmail(
            user.email,
            `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim(),
            dto.title,
            dto.message,
            dto.actionUrl
          ).catch((e) => this.logger.warn(`Broadcast email error for ${user.email}: ${e.message}`));
        }
      }
    }

    // Record Broadcast row
    const broadcastRecord = await prisma.broadcastNotification.create({
      data: {
        title: dto.title.trim(),
        message: dto.message.trim(),
        category: dto.category || NotificationCategory.BROADCAST,
        priority: dto.priority || NotificationPriority.NORMAL,
        targetAudience: dto.targetAudience || 'ALL',
        targetEmails: dto.targetEmails || null,
        actionUrl: dto.actionUrl || null,
        sendEmail: shouldSendEmail,
        recipientCount: targetUsers.length,
      },
    });

    return {
      success: true,
      message: `Broadcast notification successfully dispatched to ${targetUsers.length} traders.`,
      broadcast: broadcastRecord,
    };
  }

  /**
   * Admin: List broadcast history
   */
  async getBroadcastHistory() {
    return prisma.broadcastNotification.findMany({
      orderBy: { dispatchedAt: 'desc' },
      take: 50,
    });
  }
}
