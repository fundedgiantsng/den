import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface NinjaVerificationSessionResponse {
  status: boolean;
  message?: string;
  data?: {
    id: string;
    url: string;
    reference: string;
  };
}

@Injectable()
export class NinjaKycService {
  private readonly logger = new Logger(NinjaKycService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor() {
    this.baseUrl = process.env.NINJA_KYC_BASE_URL || 'https://api.ninja.ng/v1';
    this.apiKey = process.env.NINJA_KYC_API_KEY || '';
    this.webhookSecret = process.env.NINJA_KYC_WEBHOOK_SECRET || '';
  }

  /**
   * Initiate live Ninja KYC session for customer
   */
  async createVerificationSession(params: {
    userId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NinjaVerificationSessionResponse> {
    if (!this.apiKey) {
      throw new Error('NINJA_KYC_API_KEY is not configured in live environment.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/verification/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          reference: `FG-KYC-${params.userId}`,
          customer: {
            email: params.email,
            phone: params.phone,
            first_name: params.firstName,
            last_name: params.lastName,
          },
          callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard/verification/callback`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          status: false,
          message: data.message || `Ninja KYC error: HTTP ${response.status}`,
        };
      }

      return data;
    } catch (err: any) {
      this.logger.error(`Network error reaching Ninja KYC API: ${err.message}`);
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Verify incoming Ninja KYC webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const computed = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return computed === signature;
  }
}
