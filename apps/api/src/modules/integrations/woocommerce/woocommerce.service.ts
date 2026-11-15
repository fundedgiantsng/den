import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface AffiliatePayoutNotification {
  payoutId: string;
  traderEmail: string;
  amountNgn: number;
  referralCode?: string;
  timestamp?: string;
}

export interface PublicPayoutTrackerPayload {
  payoutId: string;
  traderName: string;
  amountNgn: number;
  certificateId: string;
  certificateHash?: string;
  profitSplitRate: number;
  programType: string;
  timestamp: string;
}

export interface CheckoutTokenRequest {
  userId: string;
  email: string;
  plan: 'rhino-rush' | 'phoenix-rise';
  size: number;
  affiliateCode?: string;
}

@Injectable()
export class WooCommerceService {
  private readonly logger = new Logger(WooCommerceService.name);
  private readonly wpBaseUrl: string;
  private readonly webhookSecret: string;
  private readonly aesSecret: string;

  constructor() {
    // Standard LocalWP port or configured environment variable
    this.wpBaseUrl =
      process.env.WOOCOMMERCE_API_URL?.replace(/\/wp-json\/wc\/v3\/?$/, '') ||
      process.env.WORDPRESS_URL ||
      'http://localhost:10005';
    this.webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'fg_live_webhook_secret_key';
    this.aesSecret = process.env.FGT_AES_SECRET || 'mY$ecur3&P@ssw0rd!2026FGT_G!ants';
  }

  /**
   * AES-256-CBC Encryption matching WordPress fgt_encrypt_payload / class-crm-api.php
   */
  encryptPayload(data: any, customSecret?: string): string {
    const secret = customSecret || this.webhookSecret || this.aesSecret;
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const jsonStr = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  /**
   * AES-256-CBC Decryption matching WordPress fgt_decrypt_payload / class-crm-api.php
   */
  decryptPayload(encryptedBase64: string, customSecret?: string): any {
    try {
      const secret = customSecret || this.webhookSecret || this.aesSecret;
      const key = crypto.createHash('sha256').update(secret).digest();
      const rawData = Buffer.from(encryptedBase64, 'base64');
      if (rawData.length < 16) return null;

      const iv = rawData.subarray(0, 16);
      const ciphertext = rawData.subarray(16);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (err: any) {
      this.logger.error(`Decryption failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Generate HMAC-SHA256 signature for outgoing WordPress payloads
   */
  generateHmacSignature(body: string, customSecret?: string): string {
    const secret = customSecret || this.webhookSecret;
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Notify WordPress Affiliate Platform of a completed trader profit payout
   * Dispatches to POST /wp-json/fg-affiliates/v1/crm-payout
   */
  async notifyAffiliatePayout(notification: AffiliatePayoutNotification): Promise<boolean> {
    try {
      const endpoint = `${this.wpBaseUrl}/wp-json/fg-affiliates/v1/crm-payout`;
      const payloadData = {
        event: 'approved',
        payout_id: notification.payoutId,
        email: notification.traderEmail,
        amount: notification.amountNgn,
        referral_code: notification.referralCode || '',
        timestamp: notification.timestamp || new Date().toISOString(),
      };

      const encryptedData = this.encryptPayload(payloadData, this.webhookSecret);
      const body = JSON.stringify({ data: encryptedData });
      const signature = this.generateHmacSignature(body, this.webhookSecret);

      this.logger.log(`Dispatching affiliate payout sync to WordPress: ${endpoint} (Payout: ${notification.payoutId})`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FGT-Signature': signature,
        },
        body,
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn(`WordPress affiliate payout sync returned status ${res.status}: ${errorText}`);
        return false;
      }

      const resData = await res.json().catch(() => ({}));
      this.logger.log(`WordPress affiliate payout sync successful: ${JSON.stringify(resData)}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to notify WordPress affiliate payout: ${err.message}`);
      return false;
    }
  }

  /**
   * Sync payout record to Public Payout Tracker on WordPress
   * Dispatches to POST /wp-json/fundedgiants/v1/payout
   */
  async syncPublicPayoutTracker(trackerPayload: PublicPayoutTrackerPayload): Promise<boolean> {
    try {
      const endpoint = `${this.wpBaseUrl}/wp-json/fundedgiants/v1/payout`;
      const body = JSON.stringify({
        payout_id: trackerPayload.payoutId,
        trader_name: trackerPayload.traderName,
        amount_ngn: trackerPayload.amountNgn,
        certificate_id: trackerPayload.certificateId,
        certificate_hash: trackerPayload.certificateHash,
        profit_split_rate: trackerPayload.profitSplitRate,
        program_type: trackerPayload.programType,
        timestamp: trackerPayload.timestamp,
      });

      const signature = this.generateHmacSignature(body, this.webhookSecret);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FGT-Signature': signature,
        },
        body,
      });

      if (!res.ok) {
        this.logger.warn(`WordPress payout tracker sync returned status ${res.status}`);
        return false;
      }

      return true;
    } catch (err: any) {
      this.logger.warn(`Could not sync to public payout tracker: ${err.message}`);
      return false;
    }
  }

  /**
   * Request a single-use checkout token from WordPress for seamless dashboard checkout
   * Dispatches to POST /wp-json/fg-affiliates/v1/checkout-token
   */
  async generateCheckoutToken(request: CheckoutTokenRequest): Promise<string | null> {
    try {
      const endpoint = `${this.wpBaseUrl}/wp-json/fg-affiliates/v1/checkout-token`;
      const payloadData = {
        user_id: request.userId,
        email: request.email,
        plan: request.plan,
        size: request.size,
        affiliate_code: request.affiliateCode || '',
      };

      const encryptedData = this.encryptPayload(payloadData, this.webhookSecret);
      const body = JSON.stringify({ data: encryptedData });
      const signature = this.generateHmacSignature(body, this.webhookSecret);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FGT-Signature': signature,
        },
        body,
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.checkout_token || null;
    } catch (err: any) {
      this.logger.error(`Error requesting checkout token: ${err.message}`);
      return null;
    }
  }
}