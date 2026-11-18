import { Controller, Post, Get, Body, Req, UnauthorizedException } from '@nestjs/common';
import { CardsService } from './cards.service';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  private async resolveSessionUser(req: any) {
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

    return session.user;
  }

  @Post('request')
  async requestCard(
    @Body()
    body: {
      fullName?: string;
      deliveryAddress?: {
        street: string;
        city: string;
        state: string;
        country?: string;
      };
    },
    @Req() req: any,
  ) {
    const user = await this.resolveSessionUser(req);
    const resolvedName =
      body.fullName ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      'Trader';

    return this.cardsService.requestCard({
      userId: user.id,
      fullName: resolvedName,
      deliveryAddress: body.deliveryAddress,
    });
  }

  @Get('my-card')
  async getMyCard(@Req() req: any) {
    const user = await this.resolveSessionUser(req);
    return this.cardsService.getMyCard(user.id);
  }
}
