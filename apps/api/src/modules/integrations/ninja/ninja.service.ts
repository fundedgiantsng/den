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

  public get baseUrl(): string {
    let rawBase = process.env.NINJA_KYC_BASE_URL || NinjaKycService.PRODUCTION_BASE_URL;
    if (rawBase.includes('api.ninja.ng')) {
      rawBase = NinjaKycService.PRODUCTION_BASE_URL;
    }
    return rawBase.replace(/\/+$/, '').trim().replace(/^['"]+|['"]+$/g, '');
  }

  public get secretKey(): string {
    const raw = process.env.NINJA_KYC_SECRET_KEY || process.env.NINJA_SECRET_KEY || '';
    return raw
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/^Bearer\s+/i, '')
      .trim();
  }

  public get publicKey(): string {
    const raw = process.env.NINJA_KYC_PUBLIC_KEY || process.env.NINJA_KYC_API_KEY || '';
    return raw
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/^Bearer\s+/i, '')
      .trim();
  }

  public get flowId(): string {
    const raw = process.env.NINJA_KYC_FLOW_ID || '';
    return raw
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .trim();
  }

  public get webhookSecret(): string {
    const raw = process.env.NINJA_KYC_WEBHOOK_SECRET || '';
    return raw
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .trim();
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
    const primaryKey = this.secretKey || this.publicKey;
    const fallbackKey = this.publicKey && this.publicKey !== primaryKey ? this.publicKey : null;

    if (!primaryKey) {
      throw new Error('NINJA_KYC_SECRET_KEY is not configured in live environment.');
    }

    if (!this.flowId) {
      throw new Error('NINJA_KYC_FLOW_ID is not configured in live environment.');
    }

    const cleanFirst = (params.firstName || 'Trader').trim();
    const cleanLast = (params.lastName || '').trim();
    const customerName = `${cleanFirst} ${cleanLast}`.trim();

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

    const executeRequest = async (key: string) => {
      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'x-api-key': key,
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let response = await executeRequest(primaryKey);
      let data = await response.json().catch(() => ({}));

      // If unauthorized with secret key and public key is available, retry with public key
      if ((response.status === 401 || data.message?.toLowerCase().includes('secret key')) && fallbackKey) {
        this.logger.warn(`Ninja KYC returned 401 with primary key. Retrying with public key / client ID...`);
        const retryRes = await executeRequest(fallbackKey);
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok && retryData.url) {
          response = retryRes;
          data = retryData;
        }
      }

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
