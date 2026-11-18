import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { prisma } from '@fundedgiants/database';
import { RiskEngineService } from './risk-engine.service';
import { DeviceBindingGuard } from '../admin/device-binding.guard';

@ApiTags('Risk Engine')
@Controller('risk')
export class RiskEngineController {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  /**
   * SteraTrader Webhook / Event Stream endpoint:
   * Real-time trade open, trade close, trade modification, and equity tick broadcast.
   * Performs instantaneous O(1) risk assessment for immediate breach termination.
   */
  @Post('trade-event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive real-time trade execution and equity events from SteraTrader' })
  async handleTradeEvent(@Req() req: Request) {
    const payload = req.body;
    return this.riskEngineService.processTradeEvent(payload);
  }

  /**
   * Trader endpoint: Check real-time payout eligibility and rule compliance
   */
  @Get('eligibility/:accountId')
  @ApiOperation({ summary: 'Check real-time payout eligibility and rule compliance for an account' })
  async checkEligibility(@Param('accountId') accountId: string) {
    return this.riskEngineService.checkPayoutEligibility(accountId);
  }

  /**
   * Account real-time compliance status snapshot
   */
  @Get('status/:accountId')
  @ApiOperation({ summary: 'Fetch real-time risk compliance, drawdown metrics, and headroom' })
  async getAccountRiskStatus(@Param('accountId') accountId: string) {
    return this.riskEngineService.getAccountRiskStatus(accountId);
  }

  /**
   * Trader endpoint: Request automated instant payout approved by Risk Engine
   */
  @Post('request-payout/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request automated instant payout directly disbursed to Giants Vault' })
  async requestPayout(@Param('accountId') accountId: string, @Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.riskEngineService.processAutomatedPayout(accountId, userId);
  }

  /**
   * Admin endpoint: Routine health check and capacity telemetry
   */
  @Get('admin/health')
  @ApiOperation({ summary: 'Admin routine check of risk engine health and load capacity' })
  async getHealth() {
    return this.riskEngineService.getAdminRiskHealth();
  }

  /**
   * Admin endpoint: Routine audit summary of risk events, breaches, and auto-payouts
   */
  @Get('admin/audit-summary')
  @ApiOperation({ summary: 'Admin routine audit summary of risk events and disbursements' })
  async getAuditSummary() {
    return this.riskEngineService.getAdminRiskAuditSummary();
  }

  /**
   * Admin endpoint: Trigger on-demand full fleet audit across all active accounts
   */
  @Post('admin/run-audit')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger on-demand routine fleet audit across all active accounts' })
  async runAudit() {
    return this.riskEngineService.runFleetAudit();
  }

  /**
   * Admin endpoint: Trigger 23:00 GMT+1 session reset manually
   * (Enforces 2% daily profit cap banking & open/closed trades inclusive baseline reset)
   */
  @Post('admin/trigger-session-reset')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger daily session reset (23:00 GMT+1) manually' })
  async triggerSessionReset() {
    return this.riskEngineService.executeDailySessionReset();
  }

  private async resolveUserId(req: Request): Promise<string> {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return session.user.id;
  }
}
