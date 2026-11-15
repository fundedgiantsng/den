import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma, CardStatus } from '@fundedgiants/database';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);
  private readonly publicDir = path.resolve(__dirname, '../../../../trader-web/public/cards');
  private readonly generatedDir = path.resolve(this.publicDir, 'generated');
  private readonly blankTemplatePath = path.resolve(this.publicDir, 'card-template-blank.png');

  constructor() {
    if (!fs.existsSync(this.generatedDir)) {
      fs.mkdirSync(this.generatedDir, { recursive: true });
    }
  }

  /**
   * Stamp user's name onto the blank luxury card template and create CardOrder
   */
  async requestCard(params: {
    userId: string;
    fullName: string;
    deliveryAddress?: {
      street: string;
      city: string;
      state: string;
      country?: string;
    };
  }) {
    const { userId, fullName, deliveryAddress } = params;
    const cleanName = (fullName || 'VALUED TRADER').toUpperCase().trim();

    // 1. Generate Stamped Card JPEG using Sharp with Metallic Gold Foil SVG
    const svgOverlay = `
    <svg width="1024" height="696" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldFoilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff5db" />
          <stop offset="25%" stop-color="#ecd18b" />
          <stop offset="65%" stop-color="#c99f4d" />
          <stop offset="100%" stop-color="#8a6727" />
        </linearGradient>
        <filter id="foilEmbossShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="1" dy="1.5" stdDeviation="0.8" flood-color="#000000" flood-opacity="0.95" />
        </filter>
      </defs>
      <text x="88" y="574" 
            font-family="'Cinzel', 'Times New Roman', 'Georgia', serif" 
            font-size="32" 
            font-weight="bold" 
            letter-spacing="2" 
            fill="url(#goldFoilGrad)" 
            filter="url(#foilEmbossShadow)">${cleanName}</text>
    </svg>
    `;

    const fileName = `${userId}-spend-card.jpg`;
    const outputPath = path.resolve(this.generatedDir, fileName);

    await sharp(this.blankTemplatePath)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .jpeg({ quality: 96 })
      .toFile(outputPath);

    const assetUrl = `/cards/generated/${fileName}`;
    this.logger.log(`Stamped card successfully created at ${outputPath}`);

    // 2. Record or update CardOrder in Database for admin review and printing
    const order = await prisma.cardOrder.create({
      data: {
        userId,
        cardholderName: cleanName,
        isCustomDesign: true,
        customDesignAssetUrl: assetUrl,
        deliveryAddress: deliveryAddress || {
          street: 'Provided on dispatch',
          city: 'Lagos',
          state: 'Lagos State',
          country: 'Nigeria',
        },
        issuanceFee: 0,
        totalCharged: 0,
        isComplimentary: true,
        status: CardStatus.PENDING_APPROVAL,
      },
    });

    return {
      success: true,
      message: 'Physical spend card requested successfully and sent for admin printing approval.',
      cardOrder: order,
      downloadUrl: assetUrl,
      imageUrl: assetUrl,
      cardholderName: cleanName,
    };
  }

  /**
   * Get user's active or pending card order
   */
  async getMyCard(userId: string) {
    const order = await prisma.cardOrder.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { physicalCard: true },
    });

    if (!order) {
      return {
        hasCard: false,
        previewUrl: '/cards/card-preview-dummy.jpg',
      };
    }

    return {
      hasCard: true,
      orderId: order.id,
      cardholderName: order.cardholderName,
      status: order.status,
      imageUrl: order.customDesignAssetUrl || '/cards/card-preview-dummy.jpg',
      downloadUrl: order.customDesignAssetUrl || '/cards/card-preview-dummy.jpg',
      createdAt: order.createdAt,
    };
  }
}
