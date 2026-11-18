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

  // Official Ninja KYC API Base URL
  public static readonly PRODUCTION_BASE_URL = 'https://api.ninja.boucloud.io';

  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly flowId: string;
  private readonly webhookSecret: string;

  constructor() {
    let rawBase = process.env.NINJA_KYC_BASE_URL || NinjaKycService.PRODUCTION_BASE_URL;
    if (rawBase.includes('api.ninja.ng')) {
      rawBase = NinjaKycService.PRODUCTION_BASE_URL;
    }
    this.baseUrl = rawBase.replace(/\/+$/, '');
    this.publicKey = process.env.NINJA_KYC_PUBLIC_KEY || process.env.NINJA_KYC_API_KEY || '';
    this.secretKey = process.env.NINJA_KYC_SECRET_KEY || '';
    this.flowId = process.env.NINJA_KYC_FLOW_ID || '';
    this.webhookSecret = process.env.NINJA_KYC_WEBHOOK_SECRET || '';
  }

  /**
   * Initiate live Ninja Hosted KYC session for customer.
   * Returns secure hosted verification URL where customer completes BVN, liveness, and ID verification.
   * Calls: POST https://api.ninja.boucloud.io/api/flows/:id/links
   */
  async createVerificationSession(params: {
    userId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NinjaVerificationSessionResponse> {
    if (!this.secretKey && !this.publicKey) {
      throw new Error('NINJA_KYC_SECRET_KEY is not configured in live environment.');
    }

    if (!this.flowId) {
      throw new Error('NINJA_KYC_FLOW_ID is not configured in live environment.');
    }

    const cleanFirst = (params.firstName || 'Trader').trim();
    const cleanLast = (params.lastName || '').trim();
    const customerName = `${cleanFirst} ${cleanLast}`.trim();

    try {
      const authHeader = this.secretKey ? `Bearer ${this.secretKey}` : `Bearer ${this.publicKey}`;

      const payload: Record<string, any> = {
        customer_name: customerName,
        customer_email: params.email,
        customer_ref: params.userId,
        values: {
          first_name: cleanFirst,
          ...(cleanLast ? { last_name: cleanLast } : {}),
        },
      };

      const endpoint = `${this.baseUrl}/api/flows/${this.flowId}/links`;
      this.logger.log(`Requesting Ninja Hosted KYC link from ${endpoint} for user ${params.userId} (${params.email})`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        const errorMsg = data.message || data.error || `Ninja KYC error: HTTP ${response.status}`;
        this.logger.error(`Ninja KYC hosted session creation failed (HTTP ${response.status}): ${JSON.stringify(data)}`);
        return {
          status: false,
          message: errorMsg,
        };
      }

      this.logger.log(`Ninja Hosted KYC URL created successfully: ${data.url} (ID: ${data.id})`);
      return {
        status: true,
        message: 'Hosted KYC session created successfully',
        data: {
          id: data.id || `vs_${params.userId}`,
          url: data.url,
          reference: params.userId,
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
   * Verify incoming Ninja KYC webhook signature using HMAC SHA256 if configured
   */
  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    const secret = this.webhookSecret || this.secretKey || this.publicKey;
    if (!signature) return false;
    if (!secret) return false;
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return computed.toLowerCase() === signature.toLowerCase();
  }
}
