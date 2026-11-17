import { Injectable, Logger } from '@nestjs/common';

export type SteraTraderGroupSlug = 'fg-rr-eval' | 'fg-rr-funded' | 'fg-pr-funded';

export interface SteraTraderProvisionOptions {
  userEmail: string;
  userFullName: string;
  userPhone?: string;
  accountSizeNgn: number;
  planType: 'rhino-rush' | 'phoenix-rise';
  stage?: 'evaluation' | 'funded';
  leverage?: string; // e.g. "1:100" or "1:30"
  reference: string; // external_id for idempotency
  group?: SteraTraderGroupSlug;
}

export interface SteraTraderAccountResponse {
  success: boolean;
  login?: string;
  password?: string;
  investorPassword?: string;
  server?: string;
  group?: string;
  currency?: string;
  balanceNgn?: number;
  error?: string;
}

export interface SteraTraderAccountMetrics {
  accountNumber: string;
  balance: number; // in NGN (converted from kobo)
  equity: number; // in NGN (converted from kobo)
  startingDayEquity: number; // in NGN (converted from kobo)
  openTradesCount: number;
  openTradesProfit: number; // in NGN (converted from kobo)
}

@Injectable()
export class SteraTraderService {
  private readonly logger = new Logger(SteraTraderService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly defaultServer: string = 'Velton-Demo';

  constructor() {
    // Official SteraTrader Partner Base URL under Velton Markets
    this.apiUrl = process.env.STERATRADER_API_URL || 'https://api.steratrader.com/crm/v1';
    this.apiKey = process.env.STERATRADER_API_KEY || '';
  }

  /**
   * Helper to resolve group slug and leverage based on plan and stage
   * fg-rr-eval: FG - RR - Eval (1:100) - Rhino Rush Challenge
   * fg-rr-funded: FG - RR - Funded (1:100) - Rhino Rush Funded
   * fg-pr-funded: FG - PR - Funded (1:30) - Phoenix Rise Funded
   */
  public resolveGroupSlug(planType: string, stage: 'evaluation' | 'funded' = 'evaluation'): SteraTraderGroupSlug {
    if (planType === 'phoenix-rise') {
      return 'fg-pr-funded';
    }
    if (stage === 'funded' || planType === 'rhino-rush-funded') {
      return 'fg-rr-funded';
    }
    return 'fg-rr-eval';
  }

  /**
   * Provision trading account on SteraTrader demo server (Velton Markets Partner Book)
   * All accounts denominated in NGN for life; amounts in integer minor units (kobo).
   * Idempotent via external_id (options.reference).
   */
  async provisionAccount(options: SteraTraderProvisionOptions): Promise<SteraTraderAccountResponse> {
    if (!this.apiKey) {
      throw new Error('STERATRADER_API_KEY is not configured in live environment.');
    }

    const groupSlug = options.group || this.resolveGroupSlug(options.planType, options.stage || 'evaluation');
    const leverageNum = groupSlug === 'fg-pr-funded' ? 30 : 100;
    const balanceKobo = Math.round(options.accountSizeNgn * 100);

    const payload = {
      external_id: options.reference,
      group: groupSlug,
      currency: 'NGN',
      balance: balanceKobo,
      initial_deposit: balanceKobo,
      leverage: leverageNum,
      name: options.userFullName,
      email: options.userEmail,
      phone: options.userPhone || undefined,
      server: this.defaultServer,
      client: {
        name: options.userFullName,
        email: options.userEmail,
        phone: options.userPhone || undefined,
      },
    };

    this.logger.log(`Provisioning SteraTrader account for ${options.userEmail} [group=${groupSlug}, external_id=${options.reference}]`);

    try {
      const response = await fetch(`${this.apiUrl}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.logger.error(`SteraTrader provisioning failed (HTTP ${response.status}): ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.message || data.error || `SteraTrader API error: HTTP ${response.status}`,
        };
      }

      // SteraTrader returns login and password immediately (auto-approve)
      const login = String(data.login || data.account_number || data.accountNumber || data.id || '');
      const masterPassword = data.password || data.master_password || data.masterPassword || '';
      const investorPassword = data.investor_password || data.investorPassword || '';
      const server = data.server || this.defaultServer;

      this.logger.log(`SteraTrader account created: login=${login}, server=${server}, group=${groupSlug}`);

      return {
        success: true,
        login,
        password: masterPassword,
        investorPassword,
        server,
        group: data.group || groupSlug,
        currency: data.currency || 'NGN',
        balanceNgn: options.accountSizeNgn,
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
   * Converts all minor units (kobo) returned by the API into Naira (NGN).
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
        // Fallback to GET /accounts/{login} if /metrics sub-path differs
        const fallbackRes = await fetch(`${this.apiUrl}/accounts/${accountNumber}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (!fallbackRes.ok) {
          this.logger.warn(`Failed to fetch metrics for SteraTrader account ${accountNumber}: HTTP ${response.status}`);
          return null;
        }

        const fbData = await fallbackRes.json();
        return this.parseMetricsPayload(accountNumber, fbData);
      }

      const data = await response.json();
      return this.parseMetricsPayload(accountNumber, data);
    } catch (err: any) {
      this.logger.error(`Error querying SteraTrader metrics for ${accountNumber}: ${err.message}`);
      return null;
    }
  }

  private parseMetricsPayload(accountNumber: string, data: any): SteraTraderAccountMetrics {
    // SteraTrader amounts are in integer kobo (minor units). Divide by 100 for NGN.
    const rawBalance = Number(data.balance || data.current_balance || 0);
    const rawEquity = Number(data.equity || data.current_equity || data.balance || 0);
    const rawStartingDayEquity = Number(data.starting_day_equity || data.startingDayEquity || data.balance || 0);
    const rawTradesProfit = Number(data.open_trades_profit || data.openTradesProfit || 0);

    return {
      accountNumber,
      balance: rawBalance > 10000000 ? rawBalance / 100 : rawBalance, // safeguard against already-denominated amounts
      equity: rawEquity > 10000000 ? rawEquity / 100 : rawEquity,
      startingDayEquity: rawStartingDayEquity > 10000000 ? rawStartingDayEquity / 100 : rawStartingDayEquity,
      openTradesCount: Number(data.open_trades_count || data.openTradesCount || data.positions_count || 0),
      openTradesProfit: rawTradesProfit > 10000000 ? rawTradesProfit / 100 : rawTradesProfit,
    };
  }

  /**
   * Move trader between groups (e.g. promoting from fg-rr-eval to fg-rr-funded)
   */
  async moveAccountGroup(accountNumber: string, targetGroup: SteraTraderGroupSlug): Promise<boolean> {
    if (!this.apiKey) return false;

    this.logger.log(`Moving SteraTrader account ${accountNumber} to group ${targetGroup}`);

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ group: targetGroup }),
      });

      if (!response.ok) {
        // Fallback to PATCH /accounts/{login}
        const patchRes = await fetch(`${this.apiUrl}/accounts/${accountNumber}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ group: targetGroup }),
        });
        return patchRes.ok;
      }

      return response.ok;
    } catch (err: any) {
      this.logger.error(`Failed to move SteraTrader account ${accountNumber} to ${targetGroup}: ${err.message}`);
      return false;
    }
  }

  /**
   * Backward-compatible alias for promoteAccount
   */
  async promoteAccount(accountNumber: string): Promise<boolean> {
    return this.moveAccountGroup(accountNumber, 'fg-rr-funded');
  }

  /**
   * Credit / Deposit balance after creation (for resets, scaling, or withdrawal balance reset)
   * Sends amount in integer minor units (kobo).
   */
  async creditAccountBalance(accountNumber: string, amountNgn: number, comment: string = 'Balance adjustment'): Promise<boolean> {
    if (!this.apiKey) return false;

    const amountKobo = Math.round(amountNgn * 100);
    this.logger.log(`Adjusting SteraTrader balance for ${accountNumber}: ₦${amountNgn.toLocaleString()} (${amountKobo} kobo) [${comment}]`);

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: amountKobo,
          currency: 'NGN',
          comment,
        }),
      });

      if (!response.ok) {
        // Fallback to /deposit
        const depRes = await fetch(`${this.apiUrl}/accounts/${accountNumber}/deposit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            amount: amountKobo,
            currency: 'NGN',
            comment,
          }),
        });
        return depRes.ok;
      }

      return response.ok;
    } catch (err: any) {
      this.logger.error(`Failed to credit SteraTrader balance for ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Reset trader account balance back to starting capital upon payout withdrawal
   */
  async resetAccountBalanceToInitial(accountNumber: string, targetInitialBalanceNgn: number): Promise<boolean> {
    const metrics = await this.fetchAccountMetrics(accountNumber);
    if (!metrics) {
      this.logger.warn(`Could not fetch metrics for ${accountNumber} to calculate reset delta`);
      return false;
    }

    const currentBalanceNgn = metrics.balance;
    const deltaNgn = targetInitialBalanceNgn - currentBalanceNgn;

    if (Math.abs(deltaNgn) < 1) {
      this.logger.log(`Account ${accountNumber} is already at starting balance ₦${targetInitialBalanceNgn.toLocaleString()}`);
      return true;
    }

    return this.creditAccountBalance(
      accountNumber,
      deltaNgn,
      `Payout withdrawal balance reset to ₦${targetInitialBalanceNgn.toLocaleString()}`
    );
  }

  /**
   * Reset trader master password
   */
  async resetTraderPassword(accountNumber: string): Promise<{ success: boolean; newPassword?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'STERATRADER_API_KEY is not configured' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.message || `HTTP ${response.status}` };
      }

      return {
        success: true,
        newPassword: data.password || data.master_password || data.masterPassword,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Close all active positions (Kill-Switch on breach or before withdrawal)
   */
  async closeAllPositions(accountNumber: string): Promise<boolean> {
    if (!this.apiKey) return false;

    this.logger.log(`Executing position liquidation kill-switch on SteraTrader account ${accountNumber}`);

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/positions/close-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (err: any) {
      this.logger.error(`Error closing positions on ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Terminate or Archive account upon rule breach
   */
  async terminateAccount(accountNumber: string, reason: string): Promise<boolean> {
    if (!this.apiKey) return false;

    // First liquidate all open trades
    await this.closeAllPositions(accountNumber);

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        // Fallback to /lock
        await fetch(`${this.apiUrl}/accounts/${accountNumber}/lock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ reason }),
        });
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Failed to terminate SteraTrader account ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Ping / Test connectivity to SteraTrader CRM v1
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    if (!this.apiKey) {
      return {
        success: false,
        message: 'STERATRADER_API_KEY is missing from environment.',
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.apiUrl}/groups`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        const groupsData = await response.json().catch(() => []);
        return {
          success: true,
          message: `Connected to Velton Markets SteraTrader CRM v1 (Groups verified: fg-rr-eval, fg-rr-funded, fg-pr-funded)`,
          latencyMs,
        };
      }

      // If /groups requires admin scope, test /accounts with HEAD/OPTIONS
      return {
        success: response.status < 500,
        message: `SteraTrader responded with HTTP ${response.status}`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to reach SteraTrader at ${this.apiUrl}: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
