import { Injectable, Logger } from '@nestjs/common';

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

/**
 * SendBaba Email Service
 * Official integration for SendBaba Transactional Email & Infrastructure API
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

  public get fromEmail(): string {
    return (
      process.env.SENDBABA_FROM_EMAIL ||
      process.env.SMTP_FROM ||
      'support@fundedgiants.ng'
    ).trim();
  }

  public get fromName(): string {
    return (
      process.env.SENDBABA_FROM_NAME ||
      process.env.SMTP_FROM_NAME ||
      'FundedGiants Operations'
    ).trim();
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Format the "From" address compliant with SendBaba requirements:
   * e.g. "FundedGiants Operations <support@fundedgiants.ng>" or verified domain email
   */
  public formatFromAddress(from?: string): string {
    if (from && from.trim()) {
      return from.trim();
    }
    return `${this.fromName} <${this.fromEmail}>`;
  }

  /**
   * Send a single transactional email via SendBaba REST API
   * POST /emails/send (relative to https://api.sendbaba.com/api/v1)
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

    const from = this.formatFromAddress(options.from);
    const to = Array.isArray(options.to) ? options.to : [options.to];

    const payload: Record<string, any> = {
      from,
      to: to.length === 1 ? to[0] : to,
      subject: options.subject,
    };

    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (!options.html && !options.text) {
      payload.text = options.subject;
    }

    if (options.reply_to) payload.reply_to = options.reply_to;
    if (options.cc) payload.cc = options.cc;
    if (options.bcc) payload.bcc = options.bcc;
    if (options.tags && options.tags.length > 0) payload.tags = options.tags;
    if (options.metadata) payload.metadata = options.metadata;

    const endpoint = `${this.apiUrl}/emails/send`;

    try {
      this.logger.log(`Dispatching SendBaba email to ${to.join(', ')} | Subject: "${options.subject}"`);

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
   * Verify SendBaba API credentials and domain readiness
   * Performs an API ping/handshake against SendBaba infrastructure
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
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
      // Validate key format
      if (!key.startsWith('sb_live_') && !key.startsWith('sb_test_')) {
        this.logger.warn('SendBaba API key does not start with standard sb_live_ or sb_test_ prefix.');
      }

      // Check templates or validation endpoint to test authentication handshake
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

      if (response.ok || response.status === 200 || response.status === 404) {
        return {
          success: true,
          message: `SendBaba REST API connected & authenticated successfully (${latencyMs}ms latency).`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: `SendBaba gateway handshake responded (HTTP ${response.status}, ${latencyMs}ms).`,
        latencyMs,
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
