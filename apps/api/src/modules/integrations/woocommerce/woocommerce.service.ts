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
      'https://fundedgiants.ng';
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
    const rawData = Buffer.from(encryptedBase64, 'base64');
    if (rawData.length < 16) return null;

    const iv = rawData.subarray(0, 16);
    const ciphertext = rawData.subarray(16);

    const candidateSecrets = Array.from(new Set([
      customSecret,
      this.aesSecret,
      process.env.FGT_AES_SECRET,
      'k9F#wR$2026!G!ants_AES_Secr3t_Prod_x98BqLz',
      this.webhookSecret,
      process.env.WOOCOMMERCE_WEBHOOK_SECRET,
      'mY$ecur3&P@ssw0rd!2026FGT_G!ants',
      '9f84b2c7e10a5d3f88c4b19260e7a34d5f1c8e2b7904a6d1c3e8b5f2097a4c6e',
    ])).filter((s): s is string => !!s);

    for (const secret of candidateSecrets) {
      try {
        const key = crypto.createHash('sha256').update(secret).digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
      } catch {
        // Try next candidate secret
      }
    }

    this.logger.error('Decryption failed: None of the configured AES/Webhook secrets could decrypt the incoming payload.');
    return null;
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
      const apiBase = (process.env.API_BASE_URL || process.env.API_URL || 'https://api.fundedgiants.ng').replace(/\/+$/, '');
      const certificateUrl = `${apiBase}/api/v1/certificates/file/${trackerPayload.certificateId}.jpg`;

      const body = JSON.stringify({
        payout_id: trackerPayload.payoutId,
        trader_name: trackerPayload.traderName,
        amount_ngn: trackerPayload.amountNgn,
        approved_amount: trackerPayload.amountNgn,
        certificate_id: trackerPayload.certificateId,
        certificate_url: certificateUrl,
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
          'X-FG-WEBHOOK-TOKEN': process.env.FG_PAYOUT_WEBHOOK_TOKEN || 'fg-payout-sync-token-2026',
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

  /**
   * Sync a coupon (create or update) to WooCommerce REST API and WordPress plugin
   * Ensures discount codes work seamlessly both in WordPress /get-funded checkout and in dashboard
   */
  async syncCoupon(coupon: {
    code: string;
    discountPercent: number;
    maxUsage?: number | null;
    expiresAt?: Date | string | null;
    restrictedEmails?: string[] | string | null;
    description?: string | null;
    isActive?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    const emailList = Array.isArray(coupon.restrictedEmails)
      ? coupon.restrictedEmails
      : typeof coupon.restrictedEmails === 'string'
      ? coupon.restrictedEmails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];

    const couponPayload = {
      code: coupon.code.trim().toUpperCase(),
      discount_type: 'percent',
      amount: coupon.isActive === false ? '0.00' : Number(coupon.discountPercent).toFixed(2),
      individual_use: true,
      usage_limit: coupon.maxUsage || null,
      email_restrictions: emailList,
      description: coupon.description || 'FundedGiants Platform Synced Coupon',
      date_expires: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString() : null,
    };

    // 1. Try standard WooCommerce REST API if consumer credentials configured
    if (consumerKey && consumerSecret && this.wpBaseUrl) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const searchRes = await fetch(
          `${this.wpBaseUrl}/wp-json/wc/v3/coupons?code=${encodeURIComponent(couponPayload.code)}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        if (searchRes.ok) {
          const existingList = await searchRes.json();
          if (Array.isArray(existingList) && existingList.length > 0) {
            // Update existing coupon in WooCommerce
            const wcId = existingList[0].id;
            const updateRes = await fetch(`${this.wpBaseUrl}/wp-json/wc/v3/coupons/${wcId}`, {
              method: 'PUT',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(couponPayload),
            });
            if (updateRes.ok) {
              this.logger.log(`WooCommerce coupon ${couponPayload.code} updated successfully (ID: ${wcId})`);
              return { success: true, message: `Coupon ${couponPayload.code} synced to WooCommerce (updated)` };
            }
          } else {
            // Create new coupon in WooCommerce
            const createRes = await fetch(`${this.wpBaseUrl}/wp-json/wc/v3/coupons`, {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(couponPayload),
            });
            if (createRes.ok) {
              this.logger.log(`WooCommerce coupon ${couponPayload.code} created successfully`);
              return { success: true, message: `Coupon ${couponPayload.code} synced to WooCommerce (created)` };
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`WooCommerce REST API sync failed: ${err.message}`);
      }
    }

    // 2. Also dispatch to custom FundedGiants plugin endpoint if available
    try {
      const endpoint = `${this.wpBaseUrl}/wp-json/fg-affiliates/v1/sync-coupon`;
      const encryptedData = this.encryptPayload(couponPayload, this.webhookSecret);
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

      if (res.ok) {
        this.logger.log(`WordPress fg-affiliates coupon sync successful for ${couponPayload.code}`);
        return { success: true, message: `Coupon ${couponPayload.code} synced to WordPress plugin` };
      }
    } catch (e: any) {
      // Quiet fail if local WP is offline
    }

    this.logger.log(`Coupon ${couponPayload.code} stored locally in PostgreSQL database (WooCommerce credentials pending or offline)`);
    return {
      success: true,
      message: `Coupon ${couponPayload.code} active in database (pending live WooCommerce sync)`,
    };
  }

  /**
   * Fetch order details from WooCommerce REST API
   */
  async getOrder(orderId: string | number): Promise<any | null> {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) return null;

    try {
      const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const res = await fetch(`${this.wpBaseUrl}/wp-json/wc/v3/orders/${orderId}`, {
        headers: { Authorization: authHeader },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err: any) {
      this.logger.error(`Failed to fetch WooCommerce order ${orderId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Update order status and add a note in WooCommerce
   */
  async updateOrderStatus(orderId: string | number, status: string, note?: string): Promise<boolean> {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) return false;

    try {
      const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const res = await fetch(`${this.wpBaseUrl}/wp-json/wc/v3/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
        }),
      });

      if (res.ok && note) {
        // Also add an internal order note
        await fetch(`${this.wpBaseUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note }),
        }).catch(() => {});
      }

      return res.ok;
    } catch (err: any) {
      this.logger.error(`Failed to update WooCommerce order ${orderId} status: ${err.message}`);
      return false;
    }
  }

  /**
   * Delete coupon from WooCommerce
   */
  async deleteCoupon(code: string): Promise<{ success: boolean; message: string }> {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (consumerKey && consumerSecret && this.wpBaseUrl) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const searchRes = await fetch(
          `${this.wpBaseUrl}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code.trim().toUpperCase())}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        if (searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            const wcId = list[0].id;
            await fetch(`${this.wpBaseUrl}/wp-json/wc/v3/coupons/${wcId}?force=true`, {
              method: 'DELETE',
              headers: { Authorization: authHeader },
            });
            this.logger.log(`Deleted coupon ${code} from WooCommerce (ID: ${wcId})`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not delete coupon from WooCommerce: ${err.message}`);
      }
    }

    return { success: true, message: `Coupon ${code} removed` };
  }
}
