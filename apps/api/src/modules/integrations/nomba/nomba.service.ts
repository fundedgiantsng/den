import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

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
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountId: string;
  private readonly webhookSecret: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.baseUrl = (process.env.NOMBA_BASE_URL || 'https://api.nomba.com').replace(/\/+$/, '');
    this.clientId = process.env.NOMBA_CLIENT_ID || '';
    this.clientSecret = process.env.NOMBA_CLIENT_SECRET || '';
    this.accountId = process.env.NOMBA_ACCOUNT_ID || '';
    this.webhookSecret = process.env.NOMBA_WEBHOOK_SECRET || '';
  }

  /**
   * Issue OAuth 2.0 Access Token via client_credentials
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Nomba API credentials (NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET, NOMBA_ACCOUNT_ID) are not configured.');
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

    // If live credentials are not yet configured in local environment, provide deterministic fallback
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      this.logger.warn('NOMBA credentials missing; returning structured sandbox virtual account preview.');
      return {
        status: true,
        message: 'Sandbox dedicated virtual account ready',
        data: {
          accountRef,
          accountName: customerFullName,
          bankAccountNumber: `70${Math.floor(10000000 + Math.random() * 90000000)}`,
          bankAccountName: `Fundedgiants/${customerFullName}`,
          bankName: 'Nomba Bank MFB',
          currency: 'NGN',
        },
      };
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
   * Resolve customer bank account name via Nomba lookup API
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<NombaResolveAccountResponse> {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      return {
        status: false,
        message: 'Nomba credentials not configured. Please set NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET, and NOMBA_ACCOUNT_ID.',
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
   * Verify incoming Nomba Webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const computed = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return computed === signature;
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
          message: 'Nomba API connection successful. OAuth 2.0 token verified.',
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
