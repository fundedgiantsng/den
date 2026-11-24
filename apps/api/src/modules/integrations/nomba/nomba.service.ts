import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export interface NombaVirtualAccountResponse {
  status: boolean;
  message?: string;
  data?: {
    accountRef: string;
    accountName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankName: string;
    currency: string;
  };
}

export interface NombaResolveAccountResponse {
  status: boolean;
  message?: string;
  data?: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
  };
}

export interface NombaTransferResponse {
  status: boolean;
  message?: string;
  data?: {
    reference: string;
    transactionId?: string;
    amount: number;
    status: string;
  };
}

@Injectable()
export class NombaService {
  private readonly logger = new Logger(NombaService.name);

  // Production Live Base URL
  public static readonly PRODUCTION_BASE_URL = 'https://api.nomba.com';

  private clean(val?: string): string {
    if (!val) return '';
    return val.trim().replace(/^["']|["']$/g, '').trim();
  }

  private get baseUrl(): string {
    return (this.clean(process.env.NOMBA_BASE_URL) || NombaService.PRODUCTION_BASE_URL).replace(/\/+$/, '');
  }
  private get clientId(): string {
    return this.clean(process.env.NOMBA_CLIENT_ID);
  }
  private get clientSecret(): string {
    return this.clean(process.env.NOMBA_PRIVATE_KEY || process.env.NOMBA_CLIENT_SECRET);
  }
  private get accountId(): string {
    return this.clean(process.env.NOMBA_ACCOUNT_ID);
  }
  private get webhookSecret(): string {
    return this.clean(process.env.NOMBA_WEBHOOK_SECRET);
  }

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private cachedBanks: Array<{ code: string; name: string; nipCode?: string }> | null = null;
  private cachedBanksExpiresAt: number = 0;

  constructor() {}

  /**
   * Issue OAuth 2.0 Access Token via client_credentials
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Nomba API credentials (NOMBA_CLIENT_ID, NOMBA_PRIVATE_KEY, NOMBA_ACCOUNT_ID) are not configured in environment.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/auth/token/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accountId: this.accountId,
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok || (!resData.access_token && !resData.data?.access_token)) {
        const errorMsg = resData.message || resData.description || `HTTP ${response.status}`;
        this.logger.error(`Nomba token issue failed: ${errorMsg}`);
        throw new Error(`Nomba authentication failed: ${errorMsg}`);
      }

      const token = resData.access_token || resData.data?.access_token;
      const expiresIn = resData.expires_in || resData.data?.expires_in || 3600;

      this.cachedToken = token;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;

      return token;
    } catch (err: any) {
      this.logger.error(`Error requesting Nomba access token: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create Dedicated Virtual Account for verified user
   * Sends ONLY customer first and last name (Nomba attaches brand prefix automatically)
   */
  async createVirtualAccount(params: {
    userId: string;
    firstName: string;
    lastName: string;
    bvn?: string;
  }): Promise<NombaVirtualAccountResponse> {
    const cleanFirst = params.firstName.trim();
    const cleanLast = params.lastName.trim();
    const customerFullName = `${cleanFirst} ${cleanLast}`.trim();
    const accountRef = `FG-VA-${params.userId}`;

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Nomba API credentials are missing. Virtual account creation requires NOMBA_CLIENT_ID, NOMBA_PRIVATE_KEY, and NOMBA_ACCOUNT_ID.');
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/accounts/virtual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
        body: JSON.stringify({
          accountRef,
          accountName: customerFullName,
          currency: 'NGN',
          ...(params.bvn ? { bvn: params.bvn } : {}),
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok || (resData.status === false && resData.code !== '00')) {
        const errorMsg = resData.message || resData.description || `HTTP ${response.status}`;
        this.logger.error(`Nomba virtual account creation failed: ${JSON.stringify(resData)}`);
        return {
          status: false,
          message: errorMsg,
        };
      }

      const d = resData.data || resData;
      return {
        status: true,
        message: 'Virtual account created successfully',
        data: {
          accountRef: d.accountRef || accountRef,
          accountName: d.accountName || customerFullName,
          bankAccountNumber: d.bankAccountNumber || d.accountNumber,
          bankAccountName: d.bankAccountName || `Fundedgiants/${customerFullName}`,
          bankName: d.bankName || 'Nomba Bank MFB',
          currency: d.currency || 'NGN',
        },
      };
    } catch (err: any) {
      this.logger.error(`Network error during Nomba virtual account creation: ${err.message}`);
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Create One-Time Dynamic Virtual Account for WordPress Checkout Order
   * Tied to exact expectedAmount with 24-hour expiration
   */
  async createDynamicOrderAccount(params: {
    orderId: string | number;
    amountNgn: number;
    customerName: string;
    email: string;
  }): Promise<NombaVirtualAccountResponse> {
    const cleanCustomer = (params.customerName || 'Trader').trim().replace(/[^a-zA-Z0-9 ]/g, ' ');
    const accountRef = `NMB${params.orderId}T${Date.now()}`;

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Nomba API credentials are missing in environment.');
    }

    try {
      const token = await this.getAccessToken();

      const body = {
        accountRef,
        accountName: cleanCustomer.slice(0, 80),
        currency: 'NGN',
        expectedAmount: Number(params.amountNgn),
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customerEmail: params.email,
        customerName: cleanCustomer,
      };

      const response = await fetch(`${this.baseUrl}/v1/accounts/virtual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
        body: JSON.stringify(body),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok || (resData.status === false && resData.code !== '00')) {
        const errorMsg = resData.message || resData.description || `HTTP ${response.status}`;
        this.logger.error(`Nomba dynamic virtual account creation failed: ${JSON.stringify(resData)}`);
        return {
          status: false,
          message: errorMsg,
        };
      }

      const d = resData.data || resData;
      return {
        status: true,
        message: 'Dynamic order virtual account created successfully',
        data: {
          accountRef: d.accountRef || accountRef,
          accountName: d.bankAccountName || d.accountName || `Fundedgiants/${cleanCustomer}`,
          bankAccountNumber: d.bankAccountNumber || d.accountNumber,
          bankAccountName: d.bankAccountName || `Fundedgiants/${cleanCustomer}`,
          bankName: d.bankName || 'Nomba Bank MFB',
          currency: d.currency || 'NGN',
        },
      };
    } catch (err: any) {
      this.logger.error(`Network error during Nomba dynamic virtual account creation: ${err.message}`);
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Fetch all CBN-licensed banks, microfinance banks, and fintechs from Nomba
   * Endpoint: GET /v1/transfers/banks
   */
  async getBanks(): Promise<Array<{ code: string; name: string; nipCode?: string }>> {
    if (this.cachedBanks && Date.now() < this.cachedBanksExpiresAt) {
      return this.cachedBanks;
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/transfers/banks`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(resData.data) && resData.data.length > 0) {
        const banks = resData.data
          .map((b: any) => ({
            code: String(b.code || '').trim(),
            name: String(b.name || '').trim(),
            nipCode: b.nipCode ? String(b.nipCode).trim() : undefined,
          }))
          .filter((b: any) => b.code && b.name);

        this.cachedBanks = banks;
        this.cachedBanksExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24-hour cache
        return banks;
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch dynamic bank list from Nomba: ${err.message}`);
    }

    if (this.cachedBanks) {
      return this.cachedBanks;
    }

    return [];
  }

  /**
   * Resolve customer bank account name via Nomba lookup API
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<NombaResolveAccountResponse> {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      return {
        status: false,
        message: 'Nomba credentials not configured. Please set NOMBA_CLIENT_ID, NOMBA_PRIVATE_KEY, and NOMBA_ACCOUNT_ID in Admin Dashboard.',
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/transfers/bank/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
        body: JSON.stringify({
          accountNumber,
          bankCode,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok || (resData.status === false && resData.code !== '00')) {
        return {
          status: false,
          message: resData.message || resData.description || 'Could not resolve bank account details with Nomba',
        };
      }

      const d = resData.data || resData;
      return {
        status: true,
        data: {
          accountName: d.accountName,
          accountNumber: d.accountNumber || accountNumber,
          bankCode: d.bankCode || bankCode,
        },
      };
    } catch (err: any) {
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Execute disbursement transfer to bound bank account via Nomba Transfer API
   * NOTE: Strictly manual approval in admin panel before calling this method.
   */
  async createTransfer(params: {
    amountNgn: number;
    accountNumber: string;
    bankCode: string;
    accountName: string;
    narration: string;
    reference: string;
  }): Promise<NombaTransferResponse> {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      return {
        status: false,
        message: 'Nomba credentials not configured. Payout transfer blocked until Nomba API keys are saved in Admin Dashboard.',
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/transfers/bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
        body: JSON.stringify({
          amount: params.amountNgn,
          accountNumber: params.accountNumber,
          accountName: params.accountName,
          bankCode: params.bankCode,
          merchantTxRef: params.reference,
          senderName: 'FundedGiants',
          narration: params.narration,
        }),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok || (resData.status === false && resData.code !== '00')) {
        return {
          status: false,
          message: resData.message || resData.description || 'Nomba transfer request failed',
        };
      }

      const d = resData.data || resData;
      return {
        status: true,
        data: {
          reference: d.merchantTxRef || params.reference,
          transactionId: d.transactionId || d.id,
          amount: params.amountNgn,
          status: d.status || 'SUCCESS',
        },
      };
    } catch (err: any) {
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Verify incoming Nomba Webhook signature using HMAC SHA256 (supports rawBody, composite payload, hex, and base64)
   */
  verifyWebhookSignature(rawBody: string, signature: string, timestamp?: string, payloadObj?: any): boolean {
    const secrets = [this.webhookSecret, this.clientSecret].filter(Boolean);
    if (secrets.length === 0) return true;
    if (!signature) return false;

    const cleanSig = signature.trim();

    for (const secret of secrets) {
      // 1. Direct secret token match
      if (cleanSig === secret) return true;

      // 2. Raw Body HMAC-SHA256 in hex and base64
      const computedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const computedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      if (cleanSig === computedHex || cleanSig === computedBase64) return true;

      // 3. Composite header payload as defined in Nomba Webhook Specification
      try {
        const data = payloadObj || JSON.parse(rawBody);
        const event_type = data.event_type || data.event || '';
        const request_id = data.requestId || '';
        const user_id = data.data?.merchant?.userId || '';
        const wallet_id = data.data?.merchant?.walletId || '';
        const transaction_id = data.data?.transaction?.transactionId || '';
        const type = data.data?.transaction?.type || '';
        const time = data.data?.transaction?.time || '';
        let response_code = data.data?.transaction?.responseCode;
        if (response_code === undefined || response_code === null || response_code === 'null') {
          response_code = '';
        }

        const ts = timestamp || '';
        const hashingPayload = `${event_type}:${request_id}:${user_id}:${wallet_id}:${transaction_id}:${type}:${time}:${response_code}:${ts}`;

        const compositeHex = crypto.createHmac('sha256', secret).update(hashingPayload).digest('hex');
        const compositeBase64 = crypto.createHmac('sha256', secret).update(hashingPayload).digest('base64');

        if (cleanSig === compositeHex || cleanSig === compositeBase64) return true;
      } catch (e) {
        // JSON parse fallback failed
      }
    }

    return false;
  }

  /**
   * Verify transaction or virtual account directly with Nomba live API
   */
  async confirmPayment(accountRef: string): Promise<boolean> {
    if (!accountRef) return false;
    try {
      const token = await this.getAccessToken();
      const endpoint = `${this.baseUrl}/v1/accounts/virtual/${encodeURIComponent(accountRef)}`;
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return data?.code === '00' || data?.status === true;
    } catch (err: any) {
      this.logger.error(`Error querying Nomba API for payment confirmation: ${err.message}`);
      return false;
    }
  }

  /**
   * Test live credentials connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.getAccessToken();
      if (token) {
        return {
          success: true,
          message: 'Nomba live API connection successful. OAuth 2.0 access token verified.',
        };
      }
      return {
        success: false,
        message: 'Could not retrieve token from Nomba API',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Nomba API connection test failed',
      };
    }
  }
}
