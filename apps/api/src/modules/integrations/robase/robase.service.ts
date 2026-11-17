import { Injectable, Logger } from '@nestjs/common';

export interface RobaseSendOtpOptions {
  to: string;
  code: string;
  channel: 'sms' | 'whatsapp';
}

export interface RobaseSendOtpResponse {
  success: boolean;
  messageId?: string;
  providerCost?: number;
  error?: string;
}

export interface RobaseSendSmsOptions {
  to: string;
  text: string;
  senderId?: string;
}

/**
 * Robase Integration Service
 * Official integration for Robase Transactional SMS API & WhatsApp OTP API
 * Documentation: https://robase.dev/docs, https://robase.dev/transactional-sms-api
 */
@Injectable()
export class RobaseService {
  private readonly logger = new Logger(RobaseService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly adminAlertPhone: string;

  constructor() {
    this.apiUrl = (process.env.ROBASE_API_URL || 'https://api.robase.dev/v1').replace(/\/+$/, '');
    this.apiKey = process.env.ROBASE_API_KEY || '';
    this.senderId = process.env.ROBASE_SENDER_ID || 'FundedGiants';
    this.adminAlertPhone = process.env.ADMIN_ALERT_PHONE || '';
  }

  /**
   * Format Nigerian / International phone number to E.164 (without plus)
   */
  private formatPhoneNumber(phone: string): string {
    let clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) clean = clean.substring(1);
    if (clean.startsWith('0')) clean = '234' + clean.substring(1);
    return clean;
  }

  /**
   * Send WhatsApp or SMS OTP code to trader during signup / login
   */
  async sendOtp(options: RobaseSendOtpOptions): Promise<RobaseSendOtpResponse> {
    if (!this.apiKey) {
      this.logger.warn('ROBASE_API_KEY is not configured; cannot dispatch live OTP.');
      return {
        success: false,
        error: 'ROBASE_API_KEY is not configured in live environment',
      };
    }

    const formattedTo = this.formatPhoneNumber(options.to);

    try {
      // Robase endpoints per official guide
      const endpoint = options.channel === 'whatsapp'
        ? `${this.apiUrl}/whatsapp/otp`
        : `${this.apiUrl}/sms/send`;

      const payload = options.channel === 'whatsapp'
        ? {
            to: formattedTo,
            code: options.code,
            sender: this.senderId,
          }
        : {
            to: formattedTo,
            from: this.senderId,
            message: `Your FundedGiants verification code is: ${options.code}. Valid for 5 minutes. Do not disclose this code.`,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || (data.status === false && !data.success)) {
        const errorMsg = data.message || `Robase error: HTTP ${response.status}`;
        this.logger.error(`Robase ${options.channel.toUpperCase()} OTP dispatch failed: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      this.logger.log(`Robase ${options.channel.toUpperCase()} OTP dispatched successfully to ${formattedTo}`);
      return {
        success: true,
        messageId: data.data?.messageId || data.messageId || data.id,
        providerCost: data.cost ? Number(data.cost) : undefined,
      };
    } catch (err: any) {
      this.logger.error(`Network error reaching Robase API: ${err.message}`);
      return {
        success: false,
        error: err.message || 'Network error reaching Robase API',
      };
    }
  }

  /**
   * Send arbitrary transactional SMS via Robase Transactional SMS API
   */
  async sendSms(options: RobaseSendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'ROBASE_API_KEY is not configured' };
    }

    const formattedTo = this.formatPhoneNumber(options.to);

    try {
      const response = await fetch(`${this.apiUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: formattedTo,
          from: options.senderId || this.senderId,
          message: options.text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || (data.status === false && !data.success)) {
        return { success: false, error: data.message || `HTTP ${response.status}` };
      }

      return {
        success: true,
        messageId: data.data?.messageId || data.messageId || data.id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send high-priority admin alert (e.g. withdrawal requests, breach events) directly to admin SMS
   */
  async sendAdminAlert(message: string, alertType: 'WITHDRAWAL_REQUEST' | 'RULE_BREACH' | 'ACCOUNT_PURCHASE'): Promise<boolean> {
    const adminPhone = this.adminAlertPhone || process.env.ADMIN_ALERT_PHONE;
    if (!adminPhone) {
      this.logger.warn(`No ADMIN_ALERT_PHONE configured to receive ${alertType} SMS alert.`);
      return false;
    }

    this.logger.log(`Dispatching admin SMS alert [${alertType}] to ${adminPhone}...`);
    const prefix = `[FundedGiants Alert - ${alertType}]: `;
    const result = await this.sendSms({
      to: adminPhone,
      text: `${prefix}${message}`,
    });

    return result.success;
  }
}
