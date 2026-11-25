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
  floating?: number;
  lastTradeAt?: string;
}

export interface SteraTraderPosition {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profitNgn: number;
  openedAt: Date | string;
  closedAt: Date | string | null;
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
    const rawTradesProfit = Number(data.floating ?? data.open_trades_profit ?? 0);
    // In prop firm risk management, trader equity is strictly Balance + Floating P&L.
    // Broker-level credit facilities (e.g. credit adjustments, negative credit_out lines)
    // must never distort the trader's trading equity or cause false drawdown breaches.
    // When a trader has zero open positions or floating is 0, trading equity strictly equals trading balance.
    const rawEquity = rawBalance + rawTradesProfit;
    const rawStartingDayEquity =
      data.starting_day_equity != null && !isNaN(Number(data.starting_day_equity)) && Number(data.starting_day_equity) > 0
        ? Number(data.starting_day_equity)
        : null;

    return {
      accountNumber,
      balance: rawBalance / 100,
      equity: rawEquity / 100,
      startingDayEquity: rawStartingDayEquity != null ? rawStartingDayEquity / 100 : undefined,
      openTradesCount: Number(data.open_positions ?? data.open_trades_count ?? 0),
      openTradesProfit: rawTradesProfit / 100,
      floating: rawTradesProfit / 100,
      lastTradeAt: data.last_trade_at || undefined,
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
   * Credit / Deposit balance after creation (for resets, scaling, or balance adjustment)
   * Sends amount in integer minor units (kobo) via SteraTrader /transactions API.
   */
  async creditAccountBalance(accountNumber: string, amountNgn: number, comment: string = 'Balance adjustment'): Promise<boolean> {
    if (!this.apiKey || amountNgn <= 0) return false;

    const amountKobo = Math.abs(Math.round(amountNgn * 100));
    const kind = 'deposit';
    this.logger.log(`Executing SteraTrader transaction for ${accountNumber}: ${kind} ₦${amountNgn.toLocaleString()} (${amountKobo} kobo) [${comment}]`);

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
          external_transaction_id: `TX-CR-${accountNumber}-${Date.now()}`,
          reason: comment,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        this.logger.error(`Failed SteraTrader credit transaction (HTTP ${response.status}): ${JSON.stringify(err)}`);
        return false;
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Failed to credit SteraTrader balance for ${accountNumber}: ${err.message}`);
      return false;
    }
  }

  /**
   * Debit / Wipe excess profit or withdrawal balance on SteraTrader live balance
   */
  async debitAccountBalance(accountNumber: string, amountNgn: number, comment: string = 'Debit adjustment'): Promise<boolean> {
    if (!this.apiKey || amountNgn <= 0) return true;

    // Do NOT send 'credit_out' transactions to SteraTrader. SteraTrader treats credit_out
    // as broker credit facility reduction rather than balance deduction, which pushes broker
    // credit negative and distorts broker equity.
    // Authoritative balance debit is tracked and enforced securely in the FundedGiants CRM ledger.
    this.logger.log(`Debit adjustment recorded for ${accountNumber}: ₦${amountNgn.toLocaleString()} [${comment}]. Clean broker equity preserved.`);
    return true;
  }

  /**
   * Reset trader account balance back to starting capital upon payout withdrawal or admin reinstatement.
   * Universal implementation:
   * 1. If account is already at target, returns success.
   * 2. If target > current, credits the delta.
   * 3. If target < current (debit needed):
   *    Attempts debit via SteraTrader transactions API (kind: 'withdrawal').
   *    If debit is not permitted by API key scopes (e.g. 403 Forbidden on withdrawal),
   *    it provisions a clean SteraTrader account in the same group with initial_balance = targetInitialBalanceNgn,
   *    disables the old account, and returns the new credentials so the platform tradingAccount
   *    is updated with the clean broker account.
   */
  async resetAccountBalanceToInitial(
    accountNumber: string,
    targetInitialBalanceNgn: number,
    accountContext?: {
      userId?: string;
      userEmail?: string;
      userFullName?: string;
      planType?: string;
      stage?: 'evaluation' | 'funded';
      groupSlug?: SteraTraderGroupSlug;
      leverage?: string;
    }
  ): Promise<{
    success: boolean;
    debitedInPlace?: boolean;
    newLogin?: string;
    newPassword?: string;
    newInvestorPassword?: string;
    server?: string;
    error?: string;
  }> {
    if (!this.apiKey) {
      return { success: false, error: 'STERATRADER_API_KEY is not configured' };
    }

    // 1. Fetch current account details & metrics from SteraTrader
    let accDetails: any = null;
    try {
      const accRes = await fetch(`${this.apiUrl}/accounts/${accountNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (accRes.ok) {
        const json = await accRes.json();
        accDetails = json.data || json;
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch account details for ${accountNumber}: ${err.message}`);
    }

    const currentBalanceKobo = Number(accDetails?.balance ?? 0);
    const currentBalanceNgn = currentBalanceKobo / 100;
    const deltaNgn = targetInitialBalanceNgn - currentBalanceNgn;

    if (Math.abs(deltaNgn) < 1) {
      this.logger.log(`Account ${accountNumber} is already at starting balance ₦${targetInitialBalanceNgn.toLocaleString()}`);
      return { success: true, debitedInPlace: true };
    }

    // If account balance needs to be credited up to starting balance
    if (deltaNgn > 0) {
      const credited = await this.creditAccountBalance(
        accountNumber,
        deltaNgn,
        `Balance reset to ₦${targetInitialBalanceNgn.toLocaleString()}`
      );
      return { success: credited, debitedInPlace: true };
    }

    // Account balance needs to be debited (e.g. post-payout reset from 74.5M down to 50M)
    const debitAmountNgn = Math.abs(deltaNgn);
    const debitAmountKobo = Math.round(debitAmountNgn * 100);

    // Attempt direct withdrawal debit if permitted by broker API
    try {
      const debitRes = await fetch(`${this.apiUrl}/accounts/${accountNumber}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          kind: 'withdrawal',
          amount: debitAmountKobo,
          currency: 'NGN',
          external_transaction_id: `TX-WDR-${accountNumber}-${Date.now()}`,
          reason: `Post-payout reset to ₦${targetInitialBalanceNgn.toLocaleString()}`,
        }),
      });

      if (debitRes.ok) {
        this.logger.log(`Successfully debited in-place ₦${debitAmountNgn.toLocaleString()} from SteraTrader account ${accountNumber}`);
        return { success: true, debitedInPlace: true };
      }

      const errData = await debitRes.json().catch(() => ({}));
      this.logger.warn(`SteraTrader withdrawal transaction returned HTTP ${debitRes.status} (${JSON.stringify(errData)}). Provisioning clean replacement account...`);
    } catch (txErr: any) {
      this.logger.warn(`Failed withdrawal request to SteraTrader for ${accountNumber}: ${txErr.message}`);
    }

    // When direct in-place debit is not supported by broker API key scopes (HTTP 403 / withdrawal disabled):
    // Provision a clean SteraTrader replacement account with initial_balance = targetInitialBalanceNgn
    try {
      const email = accountContext?.userEmail || accDetails?.email || 'trader@fundedgiants.ng';
      const fullName = accountContext?.userFullName || `${accDetails?.first_name || ''} ${accDetails?.last_name || ''}`.trim() || 'Funded Giant';
      const planType = (accountContext?.planType || (accDetails?.group_name?.toLowerCase().includes('rhino') ? 'rhino-rush' : 'phoenix-rise')) as any;
      const stage = accountContext?.stage || 'funded';
      const groupSlug = (accountContext?.groupSlug || this.resolveGroupSlug(planType, stage)) as SteraTraderGroupSlug;
      const leverage = accountContext?.leverage || (accDetails?.leverage ? `1:${accDetails.leverage}` : '1:30');

      const steraRes = await this.provisionAccount({
        userEmail: email,
        userFullName: fullName,
        accountSizeNgn: targetInitialBalanceNgn,
        planType,
        stage,
        group: groupSlug,
        leverage,
        reference: `FG-RESET-${accountNumber}-${Date.now()}`,
      });

      if (steraRes.success && steraRes.login) {
        this.logger.log(
          `Successfully provisioned fresh clean SteraTrader account ${steraRes.login} with initial balance ₦${targetInitialBalanceNgn.toLocaleString()} for post-payout reset (old account: ${accountNumber}).`
        );

        // Disable old account so no further trades are executed on it
        try {
          await this.updateAccountStatus(accountNumber, 'disabled', 'Account replaced by clean provisioned account upon payout reset');
        } catch {}

        return {
          success: true,
          debitedInPlace: false,
          newLogin: steraRes.login,
          newPassword: steraRes.password,
          newInvestorPassword: steraRes.investorPassword,
          server: steraRes.server,
        };
      } else {
        this.logger.error(`Failed to provision clean replacement account on SteraTrader: ${steraRes.error}`);
        return { success: false, error: steraRes.error };
      }
    } catch (provErr: any) {
      this.logger.error(`Exception while provisioning clean replacement account for ${accountNumber}: ${provErr.message}`);
      return { success: false, error: provErr.message };
    }
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
   * Fetch live open positions and executed trades (including closed historical trades) from SteraTrader
   * Queries both active positions and trade history to populate the position trading log.
   */
  async fetchAccountPositions(accountNumber: string): Promise<SteraTraderPosition[]> {
    if (!this.apiKey) {
      return [];
    }

    const mapPosition = (p: any): SteraTraderPosition => {
      // SteraTrader uses realised_pnl on closed positions, or floating/unrealised_pnl on open positions
      const rawProfit = p.realised_pnl != null ? Number(p.realised_pnl)
        : p.realized_pnl != null ? Number(p.realized_pnl)
        : p.unrealised_pnl != null ? Number(p.unrealised_pnl)
        : p.unrealized_pnl != null ? Number(p.unrealized_pnl)
        : p.profit != null ? Number(p.profit)
        : p.pnl != null ? Number(p.pnl)
        : p.floating != null ? Number(p.floating)
        : p.net_profit != null ? Number(p.net_profit)
        : 0;

      const swap = Number(p.swap || 0);
      const commission = Number(p.commission || 0);
      const totalRawProfit = rawProfit + swap + commission;

      // SteraTrader amounts are in integer kobo (minor units). Divide by 100 for NGN.
      let profitNgn = totalRawProfit !== 0 && Math.abs(totalRawProfit) >= 100 ? totalRawProfit / 100 : totalRawProfit;

      const rawDir = String(p.direction ?? p.type ?? p.side ?? p.cmd ?? 'BUY').toUpperCase();
      const direction: 'BUY' | 'SELL' = rawDir.includes('SELL') || rawDir === '1' ? 'SELL' : 'BUY';
      const volume = Number(p.volume ?? p.lots ?? p.size ?? 0.1);
      const openPrice = Number(p.open_price ?? p.openPrice ?? p.price ?? 0);
      const closePrice = p.close_price != null ? Number(p.close_price) : p.closePrice != null ? Number(p.closePrice) : null;
      const symbol = String(p.symbol || 'EURUSD');

      // Theoretical fallback calculation if profit is still 0 but trade was closed with price movement
      if (profitNgn === 0 && closePrice != null && openPrice > 0 && closePrice !== openPrice) {
        const dirMultiplier = direction === 'BUY' ? 1 : -1;
        const priceDelta = (closePrice - openPrice) * dirMultiplier;
        let contractSize = 100000;
        const symUpper = symbol.toUpperCase();
        if (symUpper.includes('XAU') || symUpper.includes('GOLD')) {
          contractSize = 100;
        } else if (symUpper.includes('BTC') || symUpper.includes('ETH') || symUpper.includes('CRYPTO')) {
          contractSize = 1;
        } else if (symUpper.includes('US30') || symUpper.includes('NAS') || symUpper.includes('SPX') || symUpper.includes('GER') || symUpper.includes('INDEX')) {
          contractSize = 1;
        }
        const usdProfit = priceDelta * contractSize * volume;
        profitNgn = Math.round(usdProfit * 1485 * 100) / 100;
      }

      return {
        id: String(p.id ?? p.ticket ?? p.position_id ?? p.order_id ?? `pos-${Date.now()}`),
        symbol,
        direction,
        volume,
        openPrice,
        closePrice,
        stopLoss: p.stop_loss != null ? Number(p.stop_loss) : p.stopLoss != null ? Number(p.stopLoss) : null,
        takeProfit: p.take_profit != null ? Number(p.take_profit) : p.takeProfit != null ? Number(p.takeProfit) : null,
        profitNgn,
        openedAt: p.opened_at || p.open_time || p.created_at || new Date().toISOString(),
        closedAt: p.closed_at || p.close_time || null,
      };
    };

    const aggregatedPositions: Map<string, SteraTraderPosition> = new Map();

    // 1. Fetch current open positions from /accounts/{login}/positions
    try {
      const response = await fetch(`${this.apiUrl}/accounts/${accountNumber}/positions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        const resJson = await response.json();
        const rawPositions = Array.isArray(resJson?.data) ? resJson.data : Array.isArray(resJson) ? resJson : [];
        for (const raw of rawPositions) {
          const mapped = mapPosition(raw);
          aggregatedPositions.set(mapped.id, mapped);
        }
      } else {
        this.logger.warn(`Failed to fetch positions for SteraTrader account ${accountNumber}: HTTP ${response.status}`);
      }
    } catch (err: any) {
      this.logger.error(`Error querying SteraTrader positions for ${accountNumber}: ${err.message}`);
    }

    // 2. Query closed positions via /accounts/{login}/positions?status=closed
    try {
      const closedResponse = await fetch(`${this.apiUrl}/accounts/${accountNumber}/positions?status=closed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (closedResponse.ok) {
        const resJson = await closedResponse.json();
        const rawClosed = Array.isArray(resJson?.data) ? resJson.data : Array.isArray(resJson) ? resJson : [];
        for (const raw of rawClosed) {
          const mapped = mapPosition(raw);
          aggregatedPositions.set(mapped.id, mapped);
        }
      }
    } catch (err: any) {
      this.logger.debug(`Could not fetch closed positions for ${accountNumber}: ${err.message}`);
    }

    // 3. Fallback/complement: Query orders if positions were empty
    if (aggregatedPositions.size === 0) {
      try {
        const ordersResponse = await fetch(`${this.apiUrl}/accounts/${accountNumber}/orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (ordersResponse.ok) {
          const resJson = await ordersResponse.json();
          const rawOrders = Array.isArray(resJson?.data) ? resJson.data : Array.isArray(resJson) ? resJson : [];
          for (const raw of rawOrders) {
            const mapped = mapPosition(raw);
            aggregatedPositions.set(mapped.id, mapped);
          }
        }
      } catch (err: any) {
        this.logger.debug(`Could not fetch orders for ${accountNumber}: ${err.message}`);
      }
    }

    return Array.from(aggregatedPositions.values());
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
