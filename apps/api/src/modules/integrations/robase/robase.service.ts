import { Injectable, Logger } from '@nestjs/common';

export interface RobaseSendOtpOptions {
  to: string;
  code?: string;
  channel?: 'sms' | 'whatsapp';
}

export interface RobaseSendOtpResponse {
  success: boolean;
  otpId?: string;
  channel?: 'sms' | 'whatsapp';
  messageId?: string;
  providerCost?: number;
  error?: string;
}

export interface RobaseVerifyOtpOptions {
  otpId: string;
  code: string;
}

export interface RobaseVerifyOtpResponse {
  valid: boolean;
  status?: string;
  attemptsRemaining?: number;
  error?: string;
}

export interface RobaseSendSmsOptions {
  to: string;
  text: string;
  senderId?: string;
}

/**
 * Robase Integration Service
 * Official integration for Robase Transactional SMS API & OTP API
 * Documentation: https://robase.dev/docs, https://robase.dev/transactional-sms-api
 */
@Injectable()
export class RobaseService {
  private readonly logger = new Logger(RobaseService.name);

  private get apiUrl(): string {
    const raw = (process.env.ROBASE_API_URL || 'https://api.robase.dev')
      .trim()
      .replace(/^[\\"'`]+|[\\"'`]+$/g, '')
      .replace(/\/+$/, '');
    // Strip trailing /v1 if present in env so /v1/otp/... does not duplicate to /v1/v1/otp/...
    return raw.replace(/\/v1$/, '');
  }

  private get apiKey(): string {
    return (process.env.ROBASE_API_KEY || '').trim().replace(/^[\\"'`]+|[\\"'`]+$/g, '');
  }

  private get senderId(): string {
    return process.env.ROBASE_SENDER_ID || 'FundedGiants';
  }

  private get adminAlertPhone(): string {
    return process.env.ADMIN_ALERT_PHONE || '+2348135120000';
  }

  /**
   * Format Nigerian / International phone number to standard E.164 (e.g. +2348135120000)
   * Supports: 08135120000, 2348135120000, +2348135120000
   */
  public formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/[^\d+]/g, '').trim();

    if (clean.startsWith('+')) {
      return clean;
    }

    if (clean.startsWith('0')) {
      return '+234' + clean.substring(1);
    }

    if (clean.startsWith('234')) {
      return '+' + clean;
    }

    return '+' + clean;
  }

  /**
   * Send WhatsApp or SMS OTP code via Robase /v1/otp/send
   * Default channel: "sms"
   */
  async sendOtp(options: RobaseSendOtpOptions): Promise<RobaseSendOtpResponse> {
    const key = this.apiKey;
    if (!key) {
      this.logger.warn('ROBASE_API_KEY is not configured; cannot dispatch live OTP.');
      return {
        success: false,
        error: 'ROBASE_API_KEY is not configured in live environment',
      };
    }

    const formattedTo = this.formatPhoneNumber(options.to);
    const channel = options.channel === 'whatsapp' ? 'whatsapp' : 'sms';

    try {
      this.logger.log(`Dispatching Robase ${channel.toUpperCase()} OTP to ${formattedTo}...`);

      const response = await fetch(`${this.apiUrl}/v1/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          phone_number: formattedTo,
          channel,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || data.message || `Robase error: HTTP ${response.status}`;
        this.logger.error(`Robase ${channel.toUpperCase()} OTP dispatch failed: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      this.logger.log(`Robase ${channel.toUpperCase()} OTP dispatched successfully (id=${data.id}, phone=${formattedTo})`);
      return {
        success: true,
        otpId: data.id,
        channel: data.channel || channel,
        providerCost: data.credit_cost ? Number(data.credit_cost) : undefined,
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
   * Verify an OTP submitted by the user via Robase /v1/otp/verify
   */
  async verifyOtp(options: RobaseVerifyOtpOptions): Promise<RobaseVerifyOtpResponse> {
    const key = this.apiKey;
    if (!key) {
      return { valid: false, error: 'ROBASE_API_KEY is not configured' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/v1/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          otp_id: options.otpId,
          code: options.code.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || data.message || `Verification error HTTP ${response.status}`;
        return {
          valid: false,
          attemptsRemaining: data.attempts_remaining,
          error: errorMsg,
        };
      }

      return {
        valid: data.valid === true,
        status: data.status,
        attemptsRemaining: data.attempts_remaining,
      };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Send arbitrary transactional SMS via Robase /v1/sms/send
   */
  async sendSms(options: RobaseSendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const key = this.apiKey;
    if (!key) {
      return { success: false, error: 'ROBASE_API_KEY is not configured' };
    }

    const formattedTo = this.formatPhoneNumber(options.to);

    try {
      const response = await fetch(`${this.apiUrl}/v1/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          phone_number: formattedTo,
          message: options.text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || data.message || `HTTP ${response.status}` };
      }

      return {
        success: true,
        messageId: data.id || data.messageId,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send high-priority admin alert (e.g. withdrawal requests, breach events) directly to admin SMS
   */
  async sendAdminAlert(message: string, alertType: 'WITHDRAWAL_REQUEST' | 'RULE_BREACH' | 'ACCOUNT_PURCHASE'): Promise<boolean> {
    const adminPhone = this.adminAlertPhone;
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
