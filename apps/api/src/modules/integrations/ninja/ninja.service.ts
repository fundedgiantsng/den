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

  // Production Ninja KYC API Base URL
  public static readonly PRODUCTION_BASE_URL = 'https://api.ninja.ng/v1';

  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly flowId: string;
  private readonly webhookSecret: string;

  constructor() {
    this.baseUrl = (process.env.NINJA_KYC_BASE_URL || NinjaKycService.PRODUCTION_BASE_URL).replace(/\/+$/, '');
    this.publicKey = process.env.NINJA_KYC_PUBLIC_KEY || process.env.NINJA_KYC_API_KEY || '';
    this.secretKey = process.env.NINJA_KYC_SECRET_KEY || '';
    this.flowId = process.env.NINJA_KYC_FLOW_ID || '';
    this.webhookSecret = process.env.NINJA_KYC_WEBHOOK_SECRET || '';
  }

  /**
   * Initiate live Ninja Hosted KYC session for customer.
   * Returns secure hosted verification URL where customer completes BVN, liveness, and ID verification.
   */
  async createVerificationSession(params: {
    userId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NinjaVerificationSessionResponse> {
    if (!this.secretKey && !this.publicKey) {
      throw new Error('NINJA_KYC_SECRET_KEY or NINJA_KYC_PUBLIC_KEY is not configured in live environment.');
    }

    const redirectUrl =
      process.env.NINJA_KYC_REDIRECT_URL ||
      `${process.env.APP_URL || 'https://trader.fundedgiants.ng'}/dashboard/profile?kyc=callback`;

    try {
      const authHeader = this.secretKey ? `Bearer ${this.secretKey}` : `Bearer ${this.publicKey}`;

      const payload: Record<string, any> = {
        reference: `FG-KYC-${params.userId}-${Date.now().toString(36)}`,
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
      };

      if (this.flowId) {
        payload.flow_id = this.flowId;
      }

      const response = await fetch(`${this.baseUrl}/verification/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          ...(this.publicKey ? { 'x-public-key': this.publicKey } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `Ninja KYC error: HTTP ${response.status}`;
        this.logger.error(`Ninja KYC hosted session creation failed: ${JSON.stringify(data)}`);
        return {
          status: false,
          message: errorMsg,
        };
      }

      // Hosted verification URL is returned in data.url or data.data.url
      const hostedUrl = data.data?.url || data.url || data.data?.link;
      return {
        status: true,
        message: 'Hosted KYC session created successfully',
        data: {
          id: data.data?.id || data.id || `ses_${params.userId}`,
          url: hostedUrl,
          reference: payload.reference,
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
   * Verify incoming Ninja KYC webhook signature using HMAC SHA256
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const computed = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return computed === signature;
  }
}
