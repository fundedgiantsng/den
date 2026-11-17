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
   * Initiate live Ninja Hosted KYC session for customer.
   * Returns secure hosted verification URL where the customer completes BVN, liveness, and ID upload.
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

    const redirectUrl =
      process.env.NINJA_KYC_REDIRECT_URL ||
      `${process.env.APP_URL || 'https://trader.fundedgiants.ng'}/dashboard/profile?kyc=callback`;

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
          callback_url: redirectUrl,
          redirect_url: redirectUrl,
          metadata: {
            userId: params.userId,
            platform: 'FundedGiants',
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          status: false,
          message: data.message || `Ninja KYC error: HTTP ${response.status}`,
        };
      }

      // Hosted verification URL is in data.url or data.data.url
      const hostedUrl = data.data?.url || data.url || data.data?.link;
      return {
        status: true,
        message: 'Hosted KYC session created successfully',
        data: {
          id: data.data?.id || data.id || `ses_${params.userId}`,
          url: hostedUrl,
          reference: `FG-KYC-${params.userId}`,
        },
      };
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
