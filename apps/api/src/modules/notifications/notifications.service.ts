import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import {
  prisma,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  TransactionType,
  AccountType,
} from '@fundedgiants/database';
import { CreateNotificationDto, CreateBroadcastDto } from './dto/notifications.dto';

// Channel Fee Schedule (FundedGiants Platform Policy)
export const NOTIFICATION_FEES = {
  IN_APP: 0,
  EMAIL: 10,
  SMS: 10,
  WHATSAPP: 25,
};

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
    }

    // Standard SMTP / Site Mail via Nodemailer
    const smtpHost = process.env.SMTP_HOST || 'localhost';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        tls: {
          rejectUnauthorized: false, // Permit self-signed internal relay on local VPS
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: toEmail,
        subject,
        text: `${subject}\n\nHello ${toName || 'Valued Trader'},\n\n${bodyText}\n\nView details: ${fullActionUrl}`,
        html: htmlContent,
      });

      this.logger.log(`SMTP email dispatched to ${toEmail} [MessageId: ${info.messageId}]`);
      return true;
    } catch (smtpErr: any) {
      this.logger.warn(`SMTP relay connection issue for ${toEmail}: ${smtpErr.message}`);
      return false;
    }
  }

  /**
   * Log a billable notification dispatch (Aggregated & Billed at End of Month)
   * Initial signup and login OTPs are always platform-sponsored (₦0).
   */
  async logNotificationDispatch(params: {
    userId: string;
    channel: NotificationChannel;
    action: string;
    isFreeOtp?: boolean;
  }) {
    const { userId, channel, action, isFreeOtp = false } = params;
    const feeNgn = isFreeOtp ? 0 : (NOTIFICATION_FEES[channel] ?? 0);
    const billingMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-11"

    return prisma.notificationBillingLog.create({
      data: {
        userId,
        channel,
        feeNgn,
        action,
        isFreeOtp,
        billingMonth,
      },
    });
  }

  /**
   * Get or initialize trader notification preferences
   */
  async getNotificationPreferences(userId: string) {
    let prefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreferences.create({
        data: {
          userId,
          inApp: true,
          email: true,
          sms: false,
          whatsapp: false,
        },
      });
    }

    return prefs;
  }

  /**
   * Update trader notification preferences
   */
  async updateNotificationPreferences(userId: string, data: Partial<{
    inApp: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    tradingAlerts: boolean;
    financeAlerts: boolean;
    securityAlerts: boolean;
    marketingAlerts: boolean;
  }>) {
    return prisma.notificationPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Accrued notification fees for the current month
   */
  async getAccruedMonthlyFees(userId: string) {
    const billingMonth = new Date().toISOString().slice(0, 7);
    const logs = await prisma.notificationBillingLog.findMany({
      where: {
        userId,
        billingMonth,
        isBilled: false,
      },
    });

    const totalNgn = logs.reduce((sum, item) => sum + Number(item.feeNgn), 0);
    return {
      billingMonth,
      totalNgn,
      unbilledDispatchesCount: logs.length,
      breakdown: {
        emailCount: logs.filter((l) => l.channel === NotificationChannel.EMAIL).length,
        smsCount: logs.filter((l) => l.channel === NotificationChannel.SMS).length,
        whatsappCount: logs.filter((l) => l.channel === NotificationChannel.WHATSAPP).length,
        inAppCount: logs.filter((l) => l.channel === NotificationChannel.IN_APP).length,
      },
    };
  }

  /**
   * End-of-Month Notification Fee Settlement Cron
   * Runs on the 1st of every month at 00:00 UTC
   * Charges aggregated notification fees to the user's Central Wallet and logs double-entry transaction
   */
  @Cron('0 0 1 * *')
  async handleMonthlyNotificationBillingCron() {
    this.logger.log('Starting End-of-Month Notification Fee settlement run...');
    return this.settleMonthlyNotificationFees();
  }

  async settleMonthlyNotificationFees(targetMonth?: string) {
    const lastMonth = targetMonth || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

    // Group unbilled logs by user
    const unbilledLogs = await prisma.notificationBillingLog.findMany({
      where: {
        billingMonth: lastMonth,
        isBilled: false,
      },
      include: { user: { include: { wallet: true } } },
    });

    const userMap = new Map<string, { user: any; logs: any[]; totalFee: number }>();
    for (const log of unbilledLogs) {
      if (!userMap.has(log.userId)) {
        userMap.set(log.userId, { user: log.user, logs: [], totalFee: 0 });
      }
      const entry = userMap.get(log.userId)!;
      entry.logs.push(log);
      entry.totalFee += Number(log.feeNgn);
    }

    const settledResults = [];

    for (const [userId, { user, logs, totalFee }] of userMap.entries()) {
      if (totalFee <= 0) {
        // Mark free OTPs as billed
        await prisma.notificationBillingLog.updateMany({
          where: { id: { in: logs.map((l) => l.id) } },
          data: { isBilled: true, billedAt: new Date() },
        });
        continue;
      }

      try {
        if (user.wallet) {
          // 1. Mark logs as billed
          await prisma.notificationBillingLog.updateMany({
            where: { id: { in: logs.map((l) => l.id) } },
            data: { isBilled: true, billedAt: new Date() },
          });

          // 2. Post to General Ledger (Double-Entry: Debit Liability, Credit Revenue)
          try {
            const liabilityAccount = await prisma.ledgerAccount.findFirst({
              where: { code: '2000-WALLET-LIABILITY' },
            });
            const revenueAccount = await prisma.ledgerAccount.findFirst({
              where: { code: '4200-NOTIFICATION-REVENUE' },
            });

            if (liabilityAccount && revenueAccount) {
              const entry = await prisma.journalEntry.create({
                data: {
                  entryNumber: `JE-NOTIF-${Date.now()}`,
                  transactionType: TransactionType.NOTIFICATION_MONTHLY_FEE,
                  reference: `NOTIF-${userId.slice(0, 6)}-${lastMonth}`,
                  narration: `Monthly Notification Settlement (${lastMonth}): ${logs.length} dispatches billed`,
                },
              });

              await prisma.journalLine.createMany({
                data: [
                  { journalEntryId: entry.id, accountId: liabilityAccount.id, debit: totalFee, credit: 0 },
                  { journalEntryId: entry.id, accountId: revenueAccount.id, debit: 0, credit: totalFee },
                ],
              });
            }
          } catch (ledgerErr: any) {
            this.logger.error(`Error posting notification fee to general ledger: ${ledgerErr.message}`);
          }

          // 3. Record Audit Event
          try {
            await prisma.auditEvent.create({
              data: {
                userId,
                action: 'NOTIFICATION_FEE_SETTLED',
                resource: 'CustomerWallet',
                resourceId: user.wallet.id,
                details: {
                  billingMonth: lastMonth,
                  totalFee,
                  dispatchesCount: logs.length,
                },
              },
            });
          } catch (auditErr: any) {
            this.logger.warn(`Failed to log audit event for notification fee: ${auditErr.message}`);
          }

          // 4. Send notification receipt to user
          await this.createNotification({
            userId,
            title: `Monthly Notification Settlement (${lastMonth})`,
            message: `A monthly charge of ₦${totalFee.toLocaleString()} has been settled from your Giants Vault for ${logs.length} operational notification dispatches.`,
            category: NotificationCategory.FINANCE,
            priority: NotificationPriority.NORMAL,
            sendEmail: false, // in-app only to avoid billing recursion
          });

          settledResults.push({ userId, totalFee, dispatches: logs.length, status: 'SETTLED' });
        }
      } catch (err: any) {
        this.logger.error(`Error settling notification fee for user ${userId}: ${err.message}`);
      }
    }

    this.logger.log(`Monthly notification settlement finished: ${settledResults.length} users processed.`);
    return {
      status: 'SUCCESS',
      billingMonth: lastMonth,
      usersProcessed: settledResults.length,
      details: settledResults,
    };
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
    actionType?: string;
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
      actionType = 'SYSTEM_ALERT',
    } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`Cannot create notification: user ${userId} not found`);
      return null;
    }

    // Always log free in-app notification
    await this.logNotificationDispatch({
      userId,
      channel: NotificationChannel.IN_APP,
      action: actionType,
      isFreeOtp: true,
    });

    let emailSent = false;
    if (sendEmail && user.email) {
      emailSent = await this.sendEmail(
        user.email,
        `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim(),
        title,
        message,
        actionUrl
      );

      if (emailSent) {
        // Log billable email dispatch (to be settled at end of month)
        await this.logNotificationDispatch({
          userId,
          channel: NotificationChannel.EMAIL,
          action: actionType,
          isFreeOtp: false,
        });
      }
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
