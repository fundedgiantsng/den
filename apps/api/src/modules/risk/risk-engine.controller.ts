import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { prisma } from '@fundedgiants/database';
import { RiskEngineService } from './risk-engine.service';

@ApiTags('Risk Engine')
@Controller('risk')
export class RiskEngineController {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  /**
   * Trader endpoint: Check real-time payout eligibility and rule compliance
   */
  @Get('eligibility/:accountId')
  @ApiOperation({ summary: 'Check real-time payout eligibility and rule compliance for an account' })
  async checkEligibility(@Param('accountId') accountId: string) {
    return this.riskEngineService.checkPayoutEligibility(accountId);
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger on-demand routine fleet audit across all active accounts' })
  async runAudit() {
    return this.riskEngineService.runFleetAudit();
  }

  private async resolveUserId(req: Request): Promise<string> {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      const demoUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
      if (!demoUser) throw new UnauthorizedException('Authentication required');
      return demoUser.id;
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
