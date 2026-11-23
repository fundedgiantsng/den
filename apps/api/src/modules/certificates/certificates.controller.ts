import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
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

  @Get('file/:fileName')
  @ApiOperation({ summary: 'Stream generated high-resolution certificate JPEG image' })
  async getCertificateFile(@Param('fileName') fileName: string, @Res() res: Response) {
    const cleanFileName = path.basename(fileName);
    const filePath = this.certificatesService.findCertificateFile(cleanFileName);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException('Certificate image file not found');
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Content-Disposition', `inline; filename="${cleanFileName}"`);
    return res.sendFile(filePath);
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
