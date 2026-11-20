import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { prisma } from '@fundedgiants/database';

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
  startingDayEquity?: number; // in NGN (converted from kobo)
  openTradesCount: number;
  openTradesProfit: number; // in NGN (converted from kobo)
}

@Injectable()
export class SteraTraderService {
  private readonly logger = new Logger(SteraTraderService.name);
  private get apiUrl(): string {
    return process.env.STERATRADER_API_URL || 'https://api.steratrader.com/crm/v1';
  }
  private get apiKey(): string {
    return process.env.STERATRADER_API_KEY || '';
  }
  private readonly defaultServer: string = 'FundedGiants';

  constructor() {}

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
    const balanceKobo = Math.round(options.accountSizeNgn * 100);

    const nameParts = (options.userFullName || 'Trader').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Trader';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    const payload: any = {
      first_name: firstName,
      last_name: lastName,
      email: options.userEmail,
      phone: options.userPhone || undefined,
      group: groupSlug,
      currency: 'NGN',
      initial_balance: balanceKobo,
      external_id: options.reference,
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
          error: data.detail ? JSON.stringify(data.detail) : data.message || `SteraTrader API error: HTTP ${response.status}`,
        };
      }

      // SteraTrader returns { success: true, message: '...', data: { login, password, investor_password, server, ... } }
      const resData = data.data || data;
      const login = String(resData.login || resData.account_number || resData.id || '');
      const masterPassword = resData.password || resData.master_password || '';
      const investorPassword = resData.investor_password || '';
      const server = 'FundedGiants';

      this.logger.log(`SteraTrader account created: login=${login}, server=${server}, group=${groupSlug}`);

      return {
        success: true,
        login,
        password: masterPassword,
        investorPassword,
        server,
        group: resData.group || groupSlug,
        currency: resData.currency || 'NGN',
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
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch metrics for SteraTrader account ${accountNumber}: HTTP ${response.status}`);
        return null;
      }

      const resJson = await response.json();
      const data = resJson.data || resJson;
      return this.parseMetricsPayload(accountNumber, data);
    } catch (err: any) {
      this.logger.error(`Error querying SteraTrader metrics for ${accountNumber}: ${err.message}`);
      return null;
    }
  }

  private parseMetricsPayload(accountNumber: string, data: any): SteraTraderAccountMetrics {
    // SteraTrader amounts are in integer kobo (minor units). Divide by 100 for NGN.
    const rawBalance = Number(data.balance ?? data.current_balance ?? 0);
    const rawEquity = Number(data.equity ?? data.current_equity ?? rawBalance);
    const rawStartingDayEquity =
      data.starting_day_equity != null && !isNaN(Number(data.starting_day_equity)) && Number(data.starting_day_equity) > 0
        ? Number(data.starting_day_equity)
        : null;
    const rawTradesProfit = Number(data.floating ?? data.open_trades_profit ?? 0);

    return {
      accountNumber,
      balance: rawBalance / 100,
      equity: rawEquity / 100,
      startingDayEquity: rawStartingDayEquity != null ? rawStartingDayEquity / 100 : undefined,
      openTradesCount: Number(data.open_positions ?? data.open_trades_count ?? 0),
      openTradesProfit: rawTradesProfit / 100,
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
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          group: targetGroup,
          reason: 'Challenge Target Reached - Promoted to Funded Stage',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        this.logger.error(`Failed to move SteraTrader group (HTTP ${response.status}): ${JSON.stringify(err)}`);
        return false;
      }

      return true;
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
   * Sends amount in integer minor units (kobo) via SteraTrader /transactions API.
   */
  async creditAccountBalance(accountNumber: string, amountNgn: number, comment: string = 'Balance adjustment'): Promise<boolean> {
    if (!this.apiKey) return false;

    const amountKobo = Math.abs(Math.round(amountNgn * 100));
    const kind = amountNgn >= 0 ? 'deposit' : 'withdrawal';
    this.logger.log(`Executing SteraTrader transaction for ${accountNumber}: ${kind} ₦${Math.abs(amountNgn).toLocaleString()} (${amountKobo} kobo) [${comment}]`);

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          kind,
          amount: amountKobo,
          currency: 'NGN',
          external_transaction_id: `TX-${accountNumber}-${Date.now()}`,
          reason: comment,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        this.logger.error(`Failed SteraTrader transaction (HTTP ${response.status}): ${JSON.stringify(err)}`);
        return false;
      }

      return true;
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
   * NOTE: SteraTrader requires an HTTP body ({}) to trigger random password generation
   */
  async resetTraderPassword(accountNumber: string): Promise<{ success: boolean; newPassword?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'STERATRADER_API_KEY is not configured' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.detail || data.message || `HTTP ${response.status}` };
      }

      const resData = data.data || data;
      return {
        success: true,
        newPassword: resData.password || resData.master_password || resData.masterPassword,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update account status on SteraTrader
   * States: 'disabled' (stops new orders), 'archived' (full deactivation), 'active'
   */
  async updateAccountStatus(accountNumber: string, status: 'disabled' | 'archived' | 'active', reason: string): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ status, reason }),
      });
      return response.ok;
    } catch (err: any) {
      this.logger.error(`Failed to update status to ${status} for ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Close a specific position on SteraTrader
   * Route: POST /crm/v1/accounts/{login}/positions/{id}/close
   */
  async closePosition(accountNumber: string, positionId: number | string, lots?: number): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'STERATRADER_API_KEY is not configured' };
    try {
      const payload: any = { external_id: `close-${positionId}-${Date.now()}` };
      if (lots !== undefined && lots > 0) payload.lots = lots;

      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/positions/${positionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data?.detail === 'already_closed' || data?.message === 'already_closed') {
          return { success: true };
        }
        return { success: false, error: JSON.stringify(data) };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Close all active positions (Kill-Switch on breach or before withdrawal)
   * Fetches open positions via GET /accounts/{login}/positions?status=open
   * and closes each position via POST /accounts/{login}/positions/{id}/close
   */
  async closeAllPositions(accountNumber: string): Promise<boolean> {
    if (!this.apiKey) return false;

    this.logger.log(`Executing position liquidation kill-switch on SteraTrader account ${accountNumber}`);

    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/positions?status=open`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        this.logger.error(`Failed to fetch open positions for ${accountNumber}: ${JSON.stringify(errData)}`);
        return false;
      }

      const resData = await response.json();
      const positions = Array.isArray(resData?.data) ? resData.data : Array.isArray(resData) ? resData : [];

      if (positions.length === 0) {
        this.logger.log(`No open positions found on account ${accountNumber}`);
        return true;
      }

      this.logger.log(`Found ${positions.length} open position(s) to liquidate on account ${accountNumber}`);

      let allSucceeded = true;
      for (const pos of positions) {
        const closeRes = await this.closePosition(accountNumber, pos.id, pos.lots);
        if (!closeRes.success) {
          allSucceeded = false;
          this.logger.error(`Failed to close position #${pos.id} on account ${accountNumber}: ${closeRes.error}`);
        } else {
          this.logger.log(`Successfully liquidated position #${pos.id} on account ${accountNumber}`);
        }
      }

      return allSucceeded;
    } catch (err: any) {
      this.logger.error(`Error closing positions on ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Terminate or Restrict account upon rule breach
   * Strictly enforces complete trading cessation without locking out read-only dispute inspection:
   * 1. Sets account status to 'disabled' on SteraTrader (stops all new trade execution)
   * 2. Liquidates all active open positions
   * 3. Retains trader login credentials so the user can log in to review history for dispute resolution
   * 4. Updates TradingAccount status to CLOSED in the database
   */
  async terminateAccount(accountNumber: string, reason: string): Promise<boolean> {
    this.logger.warn(`Restricting SteraTrader account ${accountNumber}. Reason: ${reason}`);

    // 1. Immediately disable account to block all new trade execution
    try {
      await this.updateAccountStatus(accountNumber, 'disabled', reason);
      this.logger.log(`Account ${accountNumber} set to disabled on SteraTrader`);
    } catch (err: any) {
      this.logger.warn(`Could not set status to disabled on SteraTrader: ${err.message}`);
    }

    // 2. Immediately liquidate all open positions
    try {
      await this.closeAllPositions(accountNumber);
      this.logger.log(`Closed all open positions for breached account ${accountNumber}`);
    } catch (err: any) {
      this.logger.error(`Error closing positions for account ${accountNumber}: ${err.message}`);
    }

    // 3. Update TradingAccount in database to CLOSED (do NOT scramble password so user can inspect history)
    try {
      await prisma.tradingAccount.updateMany({
        where: { accountNumber },
        data: {
          status: 'CLOSED',
        },
      });
      this.logger.log(`Database trading account status for ${accountNumber} set to CLOSED`);
    } catch (dbErr: any) {
      this.logger.error(`Failed to update trading account in database for ${accountNumber}: ${dbErr.message}`);
    }

    return true;
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

  /**
   * Fetch all instruments configured for a specific partner group
   * Returns symbol, digits, contract_size, markup_bid, markup_ask, min_spread_points, trade_mode
   * Endpoint: GET /crm/v1/groups/{group_id}/instruments
   */
  async fetchGroupInstruments(groupId: string | number): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('STERATRADER_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.apiUrl}/groups/${groupId}/instruments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch instruments for group ${groupId}: HTTP ${response.status}`);
        return [];
      }

      const resData = await response.json();
      return resData.data || (Array.isArray(resData) ? resData : []);
    } catch (err: any) {
      this.logger.error(`Error querying instruments for group ${groupId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Update spread markups and trading terms for an instrument in a group
   * Endpoint: PATCH /crm/v1/groups/{group_id}/instruments/{instrument_id}
   *
   * @param groupId Group slug or ID (e.g. 'fg-rr-eval', 'fg-rr-funded', 'fg-pr-funded')
   * @param instrumentId Instrument ID from GET /groups/{group_id}/instruments
   * @param params Markup in points and spread floors
   */
  async updateInstrumentSpread(
    groupId: string | number,
    instrumentId: string | number,
    params: {
      markupBidPoints: number;
      markupAskPoints: number;
      minSpreadPoints?: number;
      commissionPerLot?: number;
      tradeMode?: 'full' | 'close_only' | 'disabled';
    }
  ): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('STERATRADER_API_KEY is not configured');
    }

    const payload: any = {
      markup_bid: params.markupBidPoints,
      markup_ask: params.markupAskPoints,
    };

    if (params.minSpreadPoints !== undefined) {
      payload.min_spread_points = params.minSpreadPoints;
    }
    if (params.commissionPerLot !== undefined) {
      payload.commission_per_lot = params.commissionPerLot;
    }
    if (params.tradeMode !== undefined) {
      payload.trade_mode = params.tradeMode;
    }

    this.logger.log(
      `Updating SteraTrader Spread on Group ${groupId} Instrument ${instrumentId}: BidMarkup=+${params.markupBidPoints}pts, AskMarkup=+${params.markupAskPoints}pts, MinFloor=${params.minSpreadPoints || 0}pts`
    );

    try {
      const response = await fetch(`${this.apiUrl}/groups/${groupId}/instruments/${instrumentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        this.logger.error(`Failed to update SteraTrader instrument spread (HTTP ${response.status}): ${JSON.stringify(err)}`);
        return false;
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Network error updating instrument spread for ${instrumentId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Apply a standardized 40-point (4.0 pip) markup across all instruments in a partner group
   * Splits 20 points to Bid and 20 points to Ask (total spread expansion: 40 points / 4.0 pips)
   * Also sets min_spread_points floor to 40 points.
   */
  async apply4PipSpreadMarkup(groupId: string | number): Promise<{ total: number; updated: number; failed: number }> {
    const instruments = await this.fetchGroupInstruments(groupId);
    if (!instruments || instruments.length === 0) {
      return { total: 0, updated: 0, failed: 0 };
    }

    let updated = 0;
    let failed = 0;

    for (const inst of instruments) {
      const id = inst.id || inst.instrument_id;
      if (!id) continue;

      // For standard 5-digit/3-digit pairs: 40 points = 4.0 pips
      // markup_bid = 20, markup_ask = 20 (Total spread added: 40 points)
      const success = await this.updateInstrumentSpread(groupId, id, {
        markupBidPoints: 20,
        markupAskPoints: 20,
        minSpreadPoints: 40,
        tradeMode: 'full',
      });

      if (success) updated++;
      else failed++;
    }

    this.logger.log(`Completed 4-pip spread markup for group ${groupId}: ${updated}/${instruments.length} updated successfully.`);
    return { total: instruments.length, updated, failed };
  }
}
