import { Injectable, Logger } from '@nestjs/common';

export interface SteraTraderProvisionOptions {
  userEmail: string;
  userFullName: string;
  userPhone?: string;
  accountSizeNgn: number;
  planType: 'rhino-rush' | 'phoenix-rise';
  leverage: string; // e.g. "1:100" or "1:30"
  reference: string;
}

export interface SteraTraderAccountResponse {
  success: boolean;
  login?: string;
  password?: string;
  investorPassword?: string;
  server?: string;
  error?: string;
}

export interface SteraTraderAccountMetrics {
  accountNumber: string;
  balance: number;
  equity: number;
  startingDayEquity: number;
  openTradesCount: number;
  openTradesProfit: number;
}

@Injectable()
export class SteraTraderService {
  private readonly logger = new Logger(SteraTraderService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly brokerSubset: string;

  constructor() {
    this.apiUrl = process.env.STERATRADER_API_URL || 'https://api.steratrader.com/v1';
    this.apiKey = process.env.STERATRADER_API_KEY || '';
    // SteraTrader NGN account subset for Nigerian Naira broker group
    this.brokerSubset = process.env.STERATRADER_NGN_SUBSET || 'FG-NGN-Standard';
  }

  /**
   * Provision a new SteraTrader account in Nigerian Naira (NGN)
   * Explores NGN accounts subset of broker per https://www.steratrader.com/docs#subsets
   */
  async provisionAccount(options: SteraTraderProvisionOptions): Promise<SteraTraderAccountResponse> {
    if (!this.apiKey) {
      throw new Error('STERATRADER_API_KEY is not configured in live environment.');
    }

    try {
      const response = await fetch(`${this.apiUrl}/accounts/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          subset: this.brokerSubset,
          currency: 'NGN',
          balance: options.accountSizeNgn,
          leverage: options.leverage,
          client: {
            name: options.userFullName,
            email: options.userEmail,
            phone: options.userPhone,
          },
          group: options.planType === 'phoenix-rise' ? 'FG-Phoenix-Instant' : 'FG-Rhino-1Step',
          reference: options.reference,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.logger.error(`SteraTrader provisioning failed: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.message || `SteraTrader API error: HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        login: data.login || data.accountNumber,
        password: data.masterPassword || data.password,
        investorPassword: data.investorPassword,
        server: data.server || 'FundedGiants-Live',
      };
    } catch (err: any) {
      this.logger.error(`Network error connecting to SteraTrader: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Query live balance, equity, and open positions for an account
   */
  async fetchAccountMetrics(accountNumber: string): Promise<SteraTraderAccountMetrics | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch metrics for account ${accountNumber}: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      return {
        accountNumber,
        balance: Number(data.balance),
        equity: Number(data.equity),
        startingDayEquity: Number(data.startingDayEquity || data.balance),
        openTradesCount: Number(data.openTradesCount || 0),
        openTradesProfit: Number(data.openTradesProfit || 0),
      };
    } catch (err: any) {
      this.logger.error(`Error querying SteraTrader metrics for ${accountNumber}: ${err.message}`);
      return null;
    }
  }

  /**
   * Terminate or Archive account upon rule breach
   */
  async terminateAccount(accountNumber: string, reason: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ reason }),
      });

      return response.ok;
    } catch (err: any) {
      this.logger.error(`Failed to terminate SteraTrader account ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Promote 1-Step challenge account to fully funded upon passing profit target
   */
  async promoteAccount(accountNumber: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          targetGroup: 'FG-Rhino-Funded',
        }),
      });

      return response.ok;
    } catch (err: any) {
      this.logger.error(`Failed to promote SteraTrader account ${accountNumber}: ${err.message}`);
      return false;
    }
  }
}
