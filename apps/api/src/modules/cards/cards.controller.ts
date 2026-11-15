import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { CardsService } from './cards.service';
import { prisma } from '@fundedgiants/database';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

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
    // Resolve user from cookie/session or default customer for local dev
    let userId = req.user?.id;
    if (!userId) {
      const user = await prisma.user.findFirst({
        where: { role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
      });
      userId = user ? user.id : 'trader-guest';
    }

    const resolvedName =
      body.fullName ||
      (req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'OLUGBENGA OLAMIDE');

    return this.cardsService.requestCard({
      userId,
      fullName: resolvedName,
      deliveryAddress: body.deliveryAddress,
    });
  }

  @Get('my-card')
  async getMyCard(@Req() req: any) {
    let userId = req.user?.id;
    if (!userId) {
      const user = await prisma.user.findFirst({
        where: { role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
      });
      userId = user ? user.id : 'trader-guest';
    }

    return this.cardsService.getMyCard(userId);
  }
}
