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
    let rawBase = process.env.NINJA_KYC_BASE_URL || '';
    if (this.secretKey.includes('sandbox')) {
      return 'https://api.sandbox.ninja.boucloud.io';
    }
    if (!rawBase || rawBase.includes('api.ninja.ng')) {
      return NinjaKycService.PRODUCTION_BASE_URL;
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
    const primaryKey = this.secretKey;

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
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let response = await executeRequest(primaryKey);
      let data = await response.json().catch(() => ({}));

      // If unauthorized with secret key, exchange key pair for a session token via POST /auth/session per Ninja documentation
      if ((response.status === 401 || data.message?.toLowerCase().includes('secret key')) && this.publicKey) {
        this.logger.warn(`Ninja KYC link generation returned 401. Attempting /auth/session exchange...`);
        try {
          const authRes = await fetch(`${this.baseUrl}/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: this.publicKey, secret_key: this.secretKey }),
          });
          const authData = await authRes.json().catch(() => ({}));
          if (authRes.ok && authData.token) {
            this.logger.log(`Session token minted successfully from Ninja. Retrying link generation...`);
            const retryRes = await executeRequest(authData.token);
            const retryData = await retryRes.json().catch(() => ({}));
            if (retryRes.ok && retryData.url) {
              response = retryRes;
              data = retryData;
            }
          }
        } catch (authErr: any) {
          this.logger.warn(`Auth session exchange failed: ${authErr.message}`);
        }
      }

      if (!response.ok || !data.url) {
        let errorMsg = data.message || data.error || `Ninja KYC error: HTTP ${response.status}`;
        if (response.status === 401 && errorMsg.toLowerCase().includes('invalid secret key')) {
          errorMsg = 'Invalid Ninja KYC Secret Key. Please generate a fresh Secret Key on the Ninja Dashboard (https://www.ninja.ng/user/api/keys/) and update it in Admin Settings.';
        }
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
   * Fetch verification session details directly from Ninja API
   * Calls: GET https://api.ninja.boucloud.io/api/verifications/:id
   */
  async getVerification(verificationId: string): Promise<any> {
    const key = this.secretKey;
    if (!key) {
      this.logger.warn('NINJA_KYC_SECRET_KEY is not configured in live environment.');
      return null;
    }
    const cleanId = verificationId.trim();
    const endpoint = `${this.baseUrl}/api/verifications/${cleanId}`;
    this.logger.log(`Fetching verification ${cleanId} from ${endpoint}`);

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.logger.warn(`Failed to fetch verification ${cleanId} (HTTP ${res.status}): ${JSON.stringify(err)}`);
        return null;
      }

      const data = await res.json().catch(() => null);
      return data;
    } catch (err: any) {
      this.logger.error(`Network error fetching verification ${cleanId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Verify incoming Ninja KYC webhook signature using HMAC SHA256 if configured
   * Handles "hmac-sha256=" prefix and multiple possible secret candidates
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature?: string): boolean {
    if (!signature) return false;
    const cleanSig = signature.trim().replace(/^hmac-sha256=/i, '').replace(/^sha256=/i, '').trim();
    const candidateSecrets = [
      this.webhookSecret,
      this.secretKey,
      this.publicKey,
    ].filter(Boolean);

    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    for (const sec of candidateSecrets) {
      try {
        const computed = crypto.createHmac('sha256', sec).update(bodyStr).digest('hex');
        if (computed.toLowerCase() === cleanSig.toLowerCase()) {
          return true;
        }
      } catch {}
    }
    return false;
  }
}
