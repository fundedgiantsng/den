import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface LencoVirtualAccountResponse {
  status: boolean;
  message?: string;
  data?: {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
    currency: string;
    reference: string;
  };
}

export interface LencoResolveAccountResponse {
  status: boolean;
  message?: string;
  data?: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
  };
}

export interface LencoTransferResponse {
  status: boolean;
  message?: string;
  data?: {
    reference: string;
    amount: number;
    status: string;
  };
}

@Injectable()
export class LencoService {
  private readonly logger = new Logger(LencoService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor() {
    this.baseUrl = process.env.LENCO_BASE_URL || 'https://api.lenco.co/access/v1';
    this.apiKey = process.env.LENCO_API_KEY || '';
    this.webhookSecret = process.env.LENCO_WEBHOOK_SECRET || '';
  }

  /**
   * Create Dedicated Virtual Account for verified user
   * Account Name convention: FGT/FirstName LastName
   */
  async createVirtualAccount(params: {
    userId: string;
    firstName: string;
    lastName: string;
    bvn?: string;
  }): Promise<LencoVirtualAccountResponse> {
    if (!this.apiKey) {
      throw new Error('LENCO_API_KEY is not configured.');
    }

    const cleanFirst = params.firstName.trim();
    const cleanLast = params.lastName.trim();
    const accountName = `FGT/${cleanFirst} ${cleanLast}`;
    const reference = `FG-VA-${params.userId}`;

    try {
      const response = await fetch(`${this.baseUrl}/virtual-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          accountName,
          reference,
          bvn: params.bvn,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.logger.error(`Lenco virtual account creation failed: ${JSON.stringify(data)}`);
        return {
          status: false,
          message: data.message || `Lenco API error: HTTP ${response.status}`,
        };
      }

      return data;
    } catch (err: any) {
      this.logger.error(`Network error reaching Lenco API: ${err.message}`);
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Resolve customer bank account name via Lenco
   * https://lenco-api.readme.io/reference/resolve-account
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<LencoResolveAccountResponse> {
    if (!this.apiKey) {
      return {
        status: false,
        message: 'LENCO_API_KEY is not configured.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/resolve-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          accountNumber,
          bankCode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          status: false,
          message: data.message || 'Could not resolve bank account details with Lenco',
        };
      }

      return data;
    } catch (err: any) {
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Execute disbursement transfer to bound account
   * https://lenco-api.readme.io/reference/create-transfer
   */
  async createTransfer(params: {
    amountNgn: number;
    accountNumber: string;
    bankCode: string;
    narration: string;
    reference: string;
  }): Promise<LencoTransferResponse> {
    if (!this.apiKey) {
      return {
        status: false,
        message: 'LENCO_API_KEY is not configured.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: params.amountNgn,
          accountNumber: params.accountNumber,
          bankCode: params.bankCode,
          narration: params.narration,
          reference: params.reference,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          status: false,
          message: data.message || 'Lenco transfer request failed',
        };
      }

      return data;
    } catch (err: any) {
      return {
        status: false,
        message: err.message,
      };
    }
  }

  /**
   * Verify incoming Lenco Webhook signature
   * https://lenco-api.readme.io/reference/webhooks
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const computed = crypto.createHmac('sha512', this.webhookSecret).update(rawBody).digest('hex');
    return computed === signature;
  }
}
