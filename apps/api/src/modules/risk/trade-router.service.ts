import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as net from 'net';
import { prisma } from '@fundedgiants/database';

export type AbookTargetAccount =
  | 'PR-1M'
  | 'PR-2.5M'
  | 'PR-5M'
  | 'PR-10M'
  | 'PR-25M'
  | 'PR-50M'
  | 'RR-1M'
  | 'RR-2.5M'
  | 'RR-5M'
  | 'RR-10M'
  | 'RR-25M'
  | 'RR-50M';

export interface RouteTradeInstruction {
  action: 'OPEN' | 'CLOSE' | 'MODIFY';
  targetAccount: string;
  steraTradeId: string;
  accountNumber: string;
  symbol: string;
  direction?: 'BUY' | 'SELL';
  volume?: number;
  openPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  magicNumber?: number;
}

@Injectable()
export class TradeRouterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TradeRouterService.name);

  // Relay TCP Client to communicate with the MT5 Bridge Daemon on London VPS
  private socketClient: net.Socket | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private get bridgeHost(): string {
    return process.env.MT5_BRIDGE_HOST || '127.0.0.1';
  }

  private get bridgePort(): number {
    return Number(process.env.MT5_BRIDGE_PORT || 9090);
  }

  onModuleInit() {
    this.connectBridge();
  }

  onModuleDestroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socketClient) {
      this.socketClient.destroy();
      this.socketClient = null;
    }
  }

  /**
   * Keep a persistent, low-latency TCP connection to the MT5 Bridge Daemon
   * Wine/Linux forwards localhost socket packets in sub-millisecond time.
   */
  private connectBridge() {
    if (this.socketClient) {
      this.socketClient.removeAllListeners();
      this.socketClient.destroy();
    }

    this.socketClient = new net.Socket();
    this.socketClient.setNoDelay(true); // Disable Nagle's algorithm for ZERO packet delay

    this.socketClient.connect(this.bridgePort, this.bridgeHost, () => {
      this.isConnected = true;
      this.logger.log(`⚡ Connected to MT5 Bridge Daemon at ${this.bridgeHost}:${this.bridgePort} (TCP_NODELAY enabled)`);
    });

    this.socketClient.on('data', (data) => {
      try {
        const responses = data.toString().trim().split('\n');
        for (const line of responses) {
          if (!line) continue;
          const res = JSON.parse(line);
          this.handleBridgeResponse(res);
        }
      } catch (err: any) {
        this.logger.debug(`Raw bridge response: ${data.toString()}`);
      }
    });

    this.socketClient.on('error', (err) => {
      this.isConnected = false;
      this.logger.warn(`MT5 Bridge socket connection error: ${err.message}. Retrying in 5s...`);
    });

    this.socketClient.on('close', () => {
      this.isConnected = false;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectBridge();
    }, 5000);
  }

  /**
   * Helper to derive the default 12-Account Segregation Target
   */
  public resolveDefaultTargetAccount(skuPrefix: string, initialBalanceNgn: number): AbookTargetAccount {
    const isPhoenix = skuPrefix.toLowerCase().includes('phoenix');
    const prefix = isPhoenix ? 'PR' : 'RR';

    if (initialBalanceNgn <= 1_000_000) return `${prefix}-1M` as AbookTargetAccount;
    if (initialBalanceNgn <= 2_500_000) return `${prefix}-2.5M` as AbookTargetAccount;
    if (initialBalanceNgn <= 5_000_000) return `${prefix}-5M` as AbookTargetAccount;
    if (initialBalanceNgn <= 10_000_000) return `${prefix}-10M` as AbookTargetAccount;
    if (initialBalanceNgn <= 25_000_000) return `${prefix}-25M` as AbookTargetAccount;
    return `${prefix}-50M` as AbookTargetAccount;
  }

  /**
   * Calculate Replicated Broker Volume:
   * Rule: If 0.01 lot -> honor 0.01 as-is (1:1).
   *       If >= 0.02 lot -> round(volume * copyRatio) to 2 decimals (min 0.01).
   */
  public calculateBrokerVolume(traderVolume: number, copyRatio: number): number {
    if (traderVolume <= 0.01) {
      return 0.01;
    }
    const scaled = traderVolume * copyRatio;
    return Math.max(0.01, Math.round(scaled * 100) / 100);
  }

  /**
   * Route real-time trade event to MT5 A-Book (if trader is admin-activated)
   */
  public async routeTradeEvent(
    account: any,
    tradePayload: {
      event: 'TRADE_OPEN' | 'TRADE_CLOSE' | 'TRADE_UPDATE';
      tradeId: string;
      symbol: string;
      direction?: 'BUY' | 'SELL';
      volume?: number;
      openPrice?: number;
      closePrice?: number;
      stopLoss?: number;
      takeProfit?: number;
    }
  ) {
    // 1. Gating: Only route if Admin has manually enabled A-Book for this trader
    if (!account.abookEnabled) {
      return { routed: false, reason: 'ABOOK_NOT_ENABLED' };
    }

    const targetAccount =
      account.abookTargetAccount ||
      this.resolveDefaultTargetAccount(
        account.challenge?.product?.skuPrefix || 'rhino-rush',
        Number(account.initialBalance)
      );

    const copyRatio = Number(account.abookCopyRatio || 1.0);
    const traderVol = Number(tradePayload.volume || 0.01);
    const brokerVol = this.calculateBrokerVolume(traderVol, copyRatio);

    // Convert accountNumber to numeric magic number for MT5
    const numericMagic = parseInt(account.accountNumber.replace(/\D/g, ''), 10) || 100000;

    const instruction: RouteTradeInstruction = {
      action: tradePayload.event === 'TRADE_OPEN' ? 'OPEN' : tradePayload.event === 'TRADE_CLOSE' ? 'CLOSE' : 'MODIFY',
      targetAccount,
      steraTradeId: tradePayload.tradeId,
      accountNumber: account.accountNumber,
      symbol: tradePayload.symbol,
      direction: tradePayload.direction,
      volume: brokerVol,
      openPrice: tradePayload.openPrice,
      closePrice: tradePayload.closePrice,
      stopLoss: tradePayload.stopLoss,
      takeProfit: tradePayload.takeProfit,
      magicNumber: numericMagic,
      comment: `FG-${targetAccount}-${account.accountNumber}`,
    };

    // 2. Persist in database
    if (tradePayload.event === 'TRADE_OPEN') {
      await prisma.hedgeTradeRecord.upsert({
        where: { id: `HEDGE-${tradePayload.tradeId}` },
        update: {
          brokerVolume: brokerVol,
          openPrice: tradePayload.openPrice,
          status: 'PENDING',
        },
        create: {
          id: `HEDGE-${tradePayload.tradeId}`,
          tradingAccountId: account.id,
          steraTradeId: tradePayload.tradeId,
          targetAccount,
          symbol: tradePayload.symbol,
          direction: tradePayload.direction || 'BUY',
          steraVolume: traderVol,
          brokerVolume: brokerVol,
          openPrice: tradePayload.openPrice,
          status: 'PENDING',
        },
      });
    } else if (tradePayload.event === 'TRADE_CLOSE') {
      await prisma.hedgeTradeRecord.updateMany({
        where: { steraTradeId: tradePayload.tradeId },
        data: {
          closePrice: tradePayload.closePrice,
          closedAt: new Date(),
          status: 'CLOSED',
        },
      });
    }

    // 3. Dispatch to MT5 Bridge over TCP socket
    this.dispatchToBridge(instruction);

    return {
      routed: true,
      targetAccount,
      brokerVolume: brokerVol,
      instruction,
    };
  }

  /**
   * Liquidate any open hedged positions immediately when an account breaches rules
   */
  public async forceCloseHedgedTrades(tradingAccountId: string, accountNumber: string) {
    try {
      const openHedges = await prisma.hedgeTradeRecord.findMany({
        where: {
          tradingAccountId,
          status: { in: ['PENDING', 'OPEN'] },
        },
      });

      for (const hedge of openHedges) {
        this.dispatchToBridge({
          action: 'CLOSE',
          targetAccount: hedge.targetAccount,
          steraTradeId: hedge.steraTradeId,
          accountNumber,
          symbol: hedge.symbol,
          magicNumber: parseInt(accountNumber.replace(/\D/g, ''), 10) || 100000,
        });

        await prisma.hedgeTradeRecord.update({
          where: { id: hedge.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            errorMessage: 'FORCE_LIQUIDATION_RULE_BREACH',
          },
        });
      }

      this.logger.log(`⚡ Force-closed ${openHedges.length} hedged MT5 positions for breached account ${accountNumber}`);
    } catch (err: any) {
      this.logger.error(`Failed to force close hedged trades for ${accountNumber}: ${err.message}`);
    }
  }

  /**
   * Transmit JSON instruction down the open TCP pipe to London VPS MT5 EA
   */
  private dispatchToBridge(instruction: RouteTradeInstruction) {
    const payload = JSON.stringify(instruction) + '\n';

    if (this.isConnected && this.socketClient) {
      this.socketClient.write(payload, 'utf8', (err) => {
        if (err) {
          this.logger.error(`Error dispatching trade instruction to MT5: ${err.message}`);
        } else {
          this.logger.log(
            `⚡ Dispatched ${instruction.action} to MT5 [${instruction.targetAccount}] | Ticket: ${instruction.steraTradeId} | Vol: ${instruction.volume || 'N/A'}`
          );
        }
      });
    } else {
      this.logger.warn(`MT5 Bridge not connected. Instruction queued or dropped: ${instruction.steraTradeId}`);
    }
  }

  /**
   * Handle execution acknowledgement from MT5 EA
   */
  private async handleBridgeResponse(response: any) {
    if (!response || !response.steraTradeId) return;

    this.logger.log(`MT5 EA Ack: Ticket ${response.steraTradeId} -> Broker Ticket: ${response.brokerTicketId || 'N/A'}`);

    if (response.brokerTicketId) {
      await prisma.hedgeTradeRecord.updateMany({
        where: { steraTradeId: response.steraTradeId },
        data: {
          brokerTicketId: Number(response.brokerTicketId),
          status: 'OPEN',
        },
      });
    }
  }

  /**
   * Admin configuration methods
   */
  public async configureAbook(
    accountNumber: string,
    options: {
      enabled: boolean;
      targetAccount?: string;
      copyRatio?: number;
      notes?: string;
    }
  ) {
    const account = await prisma.tradingAccount.findUnique({
      where: { accountNumber },
    });

    if (!account) {
      throw new Error(`Trading account ${accountNumber} not found.`);
    }

    const updated = await prisma.tradingAccount.update({
      where: { accountNumber },
      data: {
        abookEnabled: options.enabled,
        abookTargetAccount: options.targetAccount || account.abookTargetAccount,
        abookCopyRatio: options.copyRatio !== undefined ? options.copyRatio : account.abookCopyRatio,
        abookNotes: options.notes !== undefined ? options.notes : account.abookNotes,
        abookEnabledAt: options.enabled ? new Date() : account.abookEnabledAt,
      },
    });

    this.logger.log(
      `Admin updated A-Book config for ${accountNumber}: Enabled=${options.enabled}, Target=${updated.abookTargetAccount}, Ratio=${updated.abookCopyRatio}`
    );

    return updated;
  }
}
