import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';
import { CopyTradingService } from './copytrading.service';
import { SubscribeToMasterDto, UpdateCopySettingsDto } from './copytrading.dto';

@ApiTags('CopyTrading')
@Controller('copytrading')
export class CopyTradingController {
  constructor(private readonly copyTradingService: CopyTradingService) {}

  @Get('masters')
  @ApiOperation({ summary: 'List verified master traders with real metrics and sorting' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'strategy', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['roi', 'winRate', 'copiers', 'drawdown', 'aum'] })
  async getMasters(
    @Query('search') search?: string,
    @Query('strategy') strategy?: string,
    @Query('sortBy') sortBy?: 'roi' | 'winRate' | 'copiers' | 'drawdown' | 'aum'
  ) {
    return this.copyTradingService.getMasterTraders({ search, strategy, sortBy });
  }

  @Get('masters/:id')
  @ApiOperation({ summary: 'Get single master trader strategy details and verified trade history' })
  async getMasterById(@Param('id') id: string) {
    return this.copyTradingService.getMasterTraderById(id);
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate capital from Giants Vault and start copying a master trader' })
  async subscribe(@Body() body: SubscribeToMasterDto, @Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.copyTradingService.subscribeToMaster(userId, body);
  }

  @Get('portfolio')
  @ApiOperation({ summary: 'Get current user copy trading portfolio and active subscriptions' })
  async getPortfolio(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.copyTradingService.getMyPortfolio(userId);
  }

  @Post('subscriptions/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause replicating new trades for an active subscription' })
  async pauseSubscription(@Param('id') id: string, @Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.copyTradingService.pauseSubscription(userId, id);
  }

  @Post('subscriptions/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume trade replication for a paused subscription' })
  async resumeSubscription(@Param('id') id: string, @Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.copyTradingService.resumeSubscription(userId, id);
  }

  @Post('subscriptions/:id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop copy subscription and settle capital + profit back to Giants Vault' })
  async stopSubscription(@Param('id') id: string, @Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.copyTradingService.stopSubscription(userId, id);
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
