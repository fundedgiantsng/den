import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { prisma } from '@fundedgiants/database';
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all certificates for the current logged-in trader' })
  async getMyCertificates(@Req() req: Request) {
    const userId = await this.resolveUserId(req);
    return this.certificatesService.getUserCertificates(userId);
  }

  @Post('generate-completion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stamp and generate Rhino Rush Completion Certificate' })
  async generateCompletion(
    @Body() body: { recipientName: string; accountNumber: string; date?: string }
  ) {
    return this.certificatesService.generateCompletionCertificate(body);
  }

  @Post('generate-payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stamp and generate Payout Certificate' })
  async generatePayout(
    @Body()
    body: {
      recipientName: string;
      amountNgn: number;
      accountNumber: string;
      userEmail?: string;
      payoutReference?: string;
      date?: string;
    }
  ) {
    return this.certificatesService.generatePayoutCertificate(body);
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
