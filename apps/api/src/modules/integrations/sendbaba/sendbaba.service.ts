import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';

export interface SendbabaEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  reply_to?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SendbabaEmailResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  details?: any;
}

export interface SendbabaTemplateOptions {
  to: string;
  template_id: string;
  variables?: Record<string, any>;
  subject?: string;
}

export interface SendbabaContactPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  custom_fields?: Record<string, any>;
  tags?: string[];
}

export interface SendbabaBulkSyncResult {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface SendbabaConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  orgId?: string;
}

/**
 * SendBaba Email & Contact Management Service
 * Official integration for SendBaba Transactional Email Infrastructure & Audience Sync
 * Documentation: https://sendbaba.com/docs
 */
@Injectable()
export class SendbabaService {
  private readonly logger = new Logger(SendbabaService.name);

  public get apiUrl(): string {
    const raw = (process.env.SENDBABA_API_URL || 'https://api.sendbaba.com/api/v1')
      .trim()
      .replace(/^[\\"'`]+|[\\"'`]+$/g, '')
      .replace(/\/+$/, '');
    return raw;
  }

  public get apiKey(): string {
    return (process.env.SENDBABA_API_KEY || '')
      .trim()
      .replace(/^[\\"'`]+|[\\"'`]+$/g, '');
  }

  public get orgId(): string {
    return (process.env.SENDBABA_ORG_ID || '977fdb13-474f-4eba-8f9b-e51798df16d0')
      .trim()
      .replace(/^[\\"'`]+|[\\"'`]+$/g, '');
  }

  public get webhookSecret(): string {
    return (process.env.SENDBABA_WEBHOOK_SECRET || '')
      .trim()
      .replace(/^[\\"'`]+|[\\"'`]+$/g, '');
  }

  public get fromEmail(): string {
    return this.extractCleanEmail(
      process.env.SENDBABA_FROM_EMAIL ||
      process.env.SMTP_FROM ||
      'support@fundedgiants.ng'
    );
  }

  public get fromName(): string {
    return (
      process.env.SENDBABA_FROM_NAME ||
      process.env.SMTP_FROM_NAME ||
      'FundedGiants Operations'
    ).trim();
  }

  public get syncWebhookUrl(): string {
    return `https://api.sendbaba.com/api/contacts/webhook/${this.orgId}`;
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * SendBaba strictly validates the domain name from the 'from' address.
   * If given "FundedGiants" <support@fundedgiants.ng>, SendBaba's backend splits by '@'
   * and extracts 'fundedgiants.ng>', causing a false unverified domain rejection.
   * This helper extracts strictly the raw email address.
   */
  public extractCleanEmail(from?: string): string {
    if (!from) return 'support@fundedgiants.ng';
    const match = from.match(/<([^>]+)>/);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
    return from.replace(/[<>"'`]/g, '').trim().toLowerCase();
  }

  /**
   * Send a single transactional email via SendBaba REST API
   * POST /emails/send
   */
  async sendEmail(options: SendbabaEmailOptions): Promise<SendbabaEmailResponse> {
    const key = this.apiKey;
    if (!key) {
      this.logger.warn('SENDBABA_API_KEY is not configured; skipping SendBaba dispatch.');
      return {
        success: false,
        error: 'SENDBABA_API_KEY is not configured in live environment',
      };
    }

    const cleanFrom = this.extractCleanEmail(options.from);
    const to = Array.isArray(options.to) ? options.to : [options.to];
    const cleanTo = to.map(t => this.extractCleanEmail(t));

    const payload: Record<string, any> = {
      from: cleanFrom,
      from_name: this.fromName,
      to: cleanTo.length === 1 ? cleanTo[0] : cleanTo,
      subject: options.subject,
    };

    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (!options.html && !options.text) {
      payload.text = options.subject;
    }

    if (options.reply_to) payload.reply_to = this.extractCleanEmail(options.reply_to);
    if (options.cc) {
      const cc = Array.isArray(options.cc) ? options.cc : [options.cc];
      payload.cc = cc.map(c => this.extractCleanEmail(c));
    }
    if (options.bcc) {
      const bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
      payload.bcc = bcc.map(b => this.extractCleanEmail(b));
    }
    if (options.tags && options.tags.length > 0) payload.tags = options.tags;
    if (options.metadata) payload.metadata = options.metadata;

    const endpoint = `${this.apiUrl}/emails/send`;

    try {
      this.logger.log(`Dispatching SendBaba email to ${cleanTo.join(', ')} | Subject: "${options.subject}" (From: ${cleanFrom})`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false || data.error) {
        const errorMsg =
          data.message ||
          data.error ||
          `SendBaba error: HTTP ${response.status} ${response.statusText}`;
        this.logger.error(`SendBaba email dispatch failed: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
          details: data,
        };
      }

      const messageId = data.data?.id || data.id || data.messageId;
      const status = data.data?.status || 'sent';

      this.logger.log(`SendBaba email successfully delivered/queued (id=${messageId}, status=${status})`);

      return {
        success: true,
        messageId,
        status,
        details: data,
      };
    } catch (err: any) {
      this.logger.error(`Network exception reaching SendBaba API (${endpoint}): ${err.message}`);
      return {
        success: false,
        error: err.message || 'Network exception reaching SendBaba API',
      };
    }
  }

  /**
   * Send email using a pre-configured SendBaba dynamic template
   * POST /emails/send-template
   */
  async sendTemplate(options: SendbabaTemplateOptions): Promise<SendbabaEmailResponse> {
    const key = this.apiKey;
    if (!key) {
      return { success: false, error: 'SENDBABA_API_KEY is not configured' };
    }

    const endpoint = `${this.apiUrl}/emails/send-template`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(options),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
          details: data,
        };
      }

      return {
        success: true,
        messageId: data.data?.id || data.id,
        status: data.data?.status || 'sent',
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Real-time upsert contact to SendBaba via official Organization Webhook
   * POST https://api.sendbaba.com/api/contacts/webhook/:org_id
   */
  async syncContact(payload: SendbabaContactPayload): Promise<{ success: boolean; action?: string; error?: string }> {
    const org = this.orgId;
    if (!org) {
      return { success: false, error: 'SENDBABA_ORG_ID is not configured' };
    }

    if (!payload.email || !payload.email.includes('@')) {
      return { success: false, error: 'Valid email is required for contact sync' };
    }

    const endpoint = `https://api.sendbaba.com/api/contacts/webhook/${org}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          first_name: payload.first_name || '',
          last_name: payload.last_name || '',
          phone: payload.phone || '',
          custom_fields: payload.custom_fields || {},
          tags: payload.tags || ['trader'],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        const errorMsg = data.message || data.error || `HTTP ${response.status}`;
        this.logger.warn(`SendBaba contact sync failed for ${payload.email}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      this.logger.log(`SendBaba contact synced for ${payload.email} (action: ${data.action || 'saved'})`);
      return { success: true, action: data.action || 'saved' };
    } catch (err: any) {
      this.logger.warn(`Network exception syncing contact to SendBaba: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Format a full Prisma User record into rich SendBaba contact schema
   * Includes account sizes, stage, KYC status, and behavioral tags
   */
  public formatUserToContact(user: any): SendbabaContactPayload {
    const activeAccounts = (user.tradingAccounts || []).filter(
      (a: any) => a.status === 'ACTIVE'
    );
    const totalAccounts = user.tradingAccounts?.length || 0;

    let totalInitialBalance = 0;
    for (const acc of user.tradingAccounts || []) {
      if (acc.initialBalance) {
        totalInitialBalance += Number(acc.initialBalance);
      }
    }

    const hasFunded = (user.tradingAccounts || []).some(
      (a: any) => (a.groupSlug && a.groupSlug.includes('funded')) || a.status === 'ACTIVE'
    );
    const hasChallenge = (user.challenges || []).some(
      (c: any) => c.status === 'ACTIVE' || c.status === 'PENDING_PROVISIONING'
    );

    const highestStage = hasFunded ? 'FUNDED' : hasChallenge ? 'EVALUATION' : 'REGISTERED';

    const latestChallenge = (user.challenges || [])[0];
    const latestPlan =
      latestChallenge?.product?.name || latestChallenge?.type || 'Standard Challenge';

    const tags: string[] = ['trader'];
    if (user.role === 'ADMIN') tags.push('admin');
    if (user.kycStatus === 'APPROVED') tags.push('kyc-verified');
    if (activeAccounts.length > 0) tags.push('active-trader');
    if (hasFunded) tags.push('funded-trader');

    if (totalInitialBalance >= 50000000) tags.push('tier-50m-plus');
    else if (totalInitialBalance >= 20000000) tags.push('tier-20m');
    else if (totalInitialBalance >= 10000000) tags.push('tier-10m');
    else if (totalInitialBalance > 0) tags.push('tier-starter');

    const formattedBalance = totalInitialBalance > 0
      ? `₦${totalInitialBalance.toLocaleString()}`
      : '₦0';

    return {
      email: user.email,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phone || '',
      custom_fields: {
        role: user.role,
        kyc_status: user.kycStatus,
        active_accounts_count: activeAccounts.length,
        total_accounts_count: totalAccounts,
        total_account_size: formattedBalance,
        highest_stage: highestStage,
        latest_plan: latestPlan,
        account_numbers: (user.tradingAccounts || []).map((a: any) => a.accountNumber).join(', '),
      },
      tags,
    };
  }

  /**
   * Sync single user by database ID
   */
  async syncUserById(userId: string): Promise<{ success: boolean; action?: string; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tradingAccounts: true,
          challenges: {
            include: { product: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user || !user.email) {
        return { success: false, error: 'User or email not found' };
      }

      const payload = this.formatUserToContact(user);
      return await this.syncContact(payload);
    } catch (err: any) {
      this.logger.warn(`Failed to sync user ${userId} to SendBaba: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Bulk sync all registered traders from database to SendBaba Audience
   */
  async syncAllTradersToPlatform(): Promise<SendbabaBulkSyncResult> {
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
      },
      include: {
        tradingAccounts: true,
        challenges: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    this.logger.log(`Beginning bulk sync of ${users.length} traders to SendBaba audience...`);

    for (const user of users) {
      if (!user.email || !user.email.includes('@')) {
        skipped++;
        continue;
      }

      const payload = this.formatUserToContact(user);
      const res = await this.syncContact(payload);
      if (res.success) {
        synced++;
      } else {
        failed++;
        if (res.error) errors.push(`${user.email}: ${res.error}`);
      }
    }

    this.logger.log(`SendBaba bulk sync completed: ${synced} synced, ${failed} failed, ${skipped} skipped.`);

    return {
      total: users.length,
      synced,
      failed,
      skipped,
      errors: errors.slice(0, 10),
    };
  }

  /**
   * Feed endpoint for SendBaba Dashboard's automated "api_url" contact sync pull
   */
  async getContactsFeed(skip = 0, take = 500) {
    const users = await prisma.user.findMany({
      where: { email: { not: null } },
      skip,
      take,
      include: {
        tradingAccounts: true,
        challenges: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return {
      success: true,
      total: users.length,
      contacts: users.map(u => this.formatUserToContact(u)),
    };
  }

  /**
   * Inbound webhook handler for SendBaba events
   * Handles email.unsubscribed, email.bounced, email.complained, email.delivered
   */
  async handleWebhookEvent(event: string, payload: any): Promise<{ received: boolean; action?: string; error?: string }> {
    const recipient = payload.recipient || payload.email || payload.to;
    this.logger.log(`Received SendBaba webhook event: "${event}" for recipient: ${recipient}`);

    if (!recipient) {
      return { received: true, action: 'ignored_missing_recipient' };
    }

    const cleanEmail = this.extractCleanEmail(recipient);

    try {
      const user = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });

      if (!user) {
        this.logger.log(`SendBaba event recipient ${cleanEmail} not found in database; logging event only.`);
        return { received: true, action: 'user_not_found_logged' };
      }

      if (event === 'email.unsubscribed' || event === 'email.complained') {
        await prisma.notificationPreferences.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            marketingAlerts: false,
            email: false,
          },
          update: {
            marketingAlerts: false,
            email: false,
          },
        });

        await prisma.auditEvent.create({
          data: {
            userId: user.id,
            action: 'NOTIFICATION_PREFERENCES_UPDATED',
            resource: 'SENDBABA',
            resourceId: user.id,
            details: {
              event,
              email: cleanEmail,
              reason: payload.reason || 'User clicked unsubscribe link in SendBaba email',
            },
          },
        });

        this.logger.log(`Trader ${cleanEmail} marked as unsubscribed based on SendBaba webhook event.`);
        return { received: true, action: 'preferences_updated_unsubscribed' };
      }

      if (event === 'email.bounced') {
        await prisma.auditEvent.create({
          data: {
            userId: user.id,
            action: 'EMAIL_DELIVERY_BOUNCED',
            resource: 'SENDBABA',
            resourceId: user.id,
            details: {
              event,
              email: cleanEmail,
              bounceType: payload.bounce_type || 'bounce',
              reason: payload.reason || 'SendBaba email bounced',
            },
          },
        });

        return { received: true, action: 'bounce_logged' };
      }

      return { received: true, action: 'event_recorded' };
    } catch (err: any) {
      this.logger.warn(`Error processing SendBaba webhook event ${event}: ${err.message}`);
      return { received: false, error: err.message };
    }
  }

  /**
   * Validate incoming webhook HMAC-SHA256 signature if secret is provided
   */
  public verifyWebhookSignature(rawBody: string | Buffer, signature?: string): boolean {
    const secret = this.webhookSecret;
    if (!secret || !signature) {
      // If secret is not configured, permit event but log warning
      return true;
    }

    try {
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Verify SendBaba API credentials and domain readiness
   * Performs an API ping/handshake against SendBaba infrastructure
   */
  async testConnection(): Promise<SendbabaConnectionTestResult> {
    const key = this.apiKey;
    if (!key) {
      return {
        success: false,
        message: 'SendBaba API Key is not configured. Please enter your API Key from the SendBaba Dashboard.',
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.apiUrl}/templates`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'Authentication failed. Please verify your SendBaba API Key from Dashboard → Settings → API Keys.',
          latencyMs,
        };
      }

      return {
        success: true,
        message: `SendBaba REST API connected & authenticated successfully (${latencyMs}ms latency).`,
        latencyMs,
        orgId: this.orgId,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network error reaching SendBaba API: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
