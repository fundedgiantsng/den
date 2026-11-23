import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { prisma } from '@fundedgiants/database';

export interface GeneratedCertificateResult {
  certificateId: string;
  type: 'COMPLETION' | 'PAYOUT';
  filePath: string;
  publicUrl: string;
  issueDate: string;
  recipientName: string;
  amountNgn?: number;
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  private getTemplatesDir(): string {
    const candidateDirs = [
      path.resolve(process.cwd(), 'apps/api/assets/certificates/templates'),
      path.resolve(process.cwd(), 'assets/certificates/templates'),
      path.resolve(process.cwd(), 'apps/trader-web/public/certificates/templates'),
      path.resolve(__dirname, '../../../assets/certificates/templates'),
      path.resolve(__dirname, '../../../../apps/api/assets/certificates/templates'),
      path.resolve(__dirname, '../../../../trader-web/public/certificates/templates'),
      '/var/www/fundedgiants/apps/trader-web/public/certificates/templates',
      '/var/www/fundedgiants/apps/api/assets/certificates/templates',
    ];
    for (const d of candidateDirs) {
      if (fs.existsSync(d) && fs.existsSync(path.join(d, 'payout-certificate-template.jpg'))) {
        return d;
      }
    }
    return candidateDirs[0];
  }

  getGeneratedDirs(): string[] {
    const dirs = [
      path.resolve(process.cwd(), 'apps/trader-web/public/certificates/generated'),
      path.resolve(process.cwd(), 'apps/api/assets/certificates/generated'),
      path.resolve(__dirname, '../../../../trader-web/public/certificates/generated'),
      path.resolve(__dirname, '../../../assets/certificates/generated'),
      '/var/www/fundedgiants/apps/trader-web/public/certificates/generated',
    ];
    const validDirs: string[] = [];
    for (const d of dirs) {
      try {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
        if (!validDirs.includes(d)) validDirs.push(d);
      } catch (e) {}
    }
    return validDirs;
  }

  findCertificateFile(fileName: string): string | null {
    for (const dir of this.getGeneratedDirs()) {
      const fullPath = path.join(dir, fileName);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
  }

  // In-memory template buffer caching for ultra-high throughput
  private completionTemplateBuffer: Buffer | null = null;
  private payoutTemplateBuffer: Buffer | null = null;

  constructor() {
    this.getGeneratedDirs();
    this.prewarmTemplates();
  }

  /**
   * Preload certificate template images into memory for high-throughput stamping
   */
  private prewarmTemplates() {
    try {
      const tDir = this.getTemplatesDir();
      const completionPath = path.join(tDir, 'rhino-rush-completion-template.jpg');
      if (fs.existsSync(completionPath)) {
        this.completionTemplateBuffer = fs.readFileSync(completionPath);
      }
      const payoutPath = path.join(tDir, 'payout-certificate-template.jpg');
      if (fs.existsSync(payoutPath)) {
        this.payoutTemplateBuffer = fs.readFileSync(payoutPath);
      }
    } catch (err: any) {
      this.logger.warn(`Could not preload templates into memory: ${err.message}`);
    }
  }

  /**
   * Stamp & generate Rhino Rush Completion Certificate
   */
  async generateCompletionCertificate(params: {
    recipientName: string;
    accountNumber: string;
    date?: string;
    customCertId?: string;
  }): Promise<GeneratedCertificateResult> {
    const certificateId = params.customCertId || `FG-CERT-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = params.date || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const templatePath = path.join(this.getTemplatesDir(), 'rhino-rush-completion-template.jpg');
    const fileName = `${certificateId}.jpg`;
    const genDirs = this.getGeneratedDirs();
    const outputPath = path.join(genDirs[0] || process.cwd(), fileName);

    // Title Case (small letters with capital first letters, matching 'Giant' typography)
    const cleanName = this.toTitleCase(params.recipientName);
    const nameFontSize = cleanName.length > 28 ? 26 : cleanName.length > 20 ? 30 : 34;

    // Granular scan: line begins at x=113, ends at x=581 (width = 468px), y=348
    // Font: exact typography of 'Giants', normal weight (not bold), cleanly fits line width
    const overlaySvg = `
      <svg width="1024" height="723" viewBox="0 0 1024 723" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .trader-name {
              font-family: 'Plus Jakarta Sans', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-weight: 500;
              fill: #FFFFFF;
            }
            .date-text {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-weight: 500;
              fill: #FFFFFF;
              letter-spacing: 0.5px;
            }
            .cert-id {
              font-family: 'Courier New', 'Consolas', monospace;
              font-weight: 600;
              fill: #FFFFFF;
              letter-spacing: 1px;
            }
          </style>
        </defs>

        <!-- Trader Name placed cleanly inside 468px line width in Title Case, not bold -->
        <text x="113" y="336" font-size="${nameFontSize}" class="trader-name">${cleanName}</text>

        <!-- Issue Date (enlarged, bold white) -->
        <text x="168" y="643" font-size="17" class="date-text">${issueDate}</text>

        <!-- Certificate Validation ID right below Date -->
        <text x="110" y="684" font-size="14" class="cert-id">CERTIFICATE ID: ${certificateId}</text>
      </svg>
    `;

    try {
      const baseBuffer = this.completionTemplateBuffer || fs.readFileSync(templatePath);
      const imageBuffer = await sharp(baseBuffer)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .jpeg({ quality: 95 })
        .toBuffer();

      for (const dir of genDirs) {
        try {
          fs.writeFileSync(path.join(dir, fileName), imageBuffer);
        } catch (e: any) {}
      }

      this.logger.log(`Generated Completion Certificate ${certificateId} for ${cleanName}`);
      const apiBase = (process.env.API_BASE_URL || process.env.API_URL || 'https://api.fundedgiants.ng').replace(/\/+$/, '');

      return {
        certificateId,
        type: 'COMPLETION',
        filePath: outputPath,
        publicUrl: `${apiBase}/api/v1/certificates/file/${fileName}`,
        issueDate,
        recipientName: cleanName,
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate completion certificate: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Convert name to Title Case (small letters with capital first letters, matching 'Giant' typography)
   */
  private toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format currency values to thousands notation (e.g. ₦1,000,000 -> ₦1,000k, ₦658,000 -> ₦658k)
   * Always rounded up to the closest K
   */
  private formatK(amount: number): string {
    const kVal = Math.ceil(amount / 1000);
    return `₦${kVal.toLocaleString('en-US')}k`;
  }

  /**
   * Stamp & generate Payout Certificate
   */
  async generatePayoutCertificate(params: {
    recipientName: string;
    amountNgn: number;
    accountNumber: string;
    totalProfitNgn?: number;
    userEmail?: string;
    payoutReference?: string;
    date?: string;
    customCertId?: string;
  }): Promise<GeneratedCertificateResult> {
    const certificateId = params.customCertId || `FG-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = params.date || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedAmount = `₦${params.amountNgn.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    // Calculate splits for the glowing jewel throne badges:
    // If total profit not provided, assume 80% trader tier baseline (amountNgn / 0.8)
    const totalProfit = params.totalProfitNgn || (params.amountNgn > 0 ? Math.round(params.amountNgn / 0.8) : 850000);
    const traderSplit = params.amountNgn;
    const companySplit = Math.max(0, totalProfit - traderSplit);

    const totalProfitFormatted = `₦${totalProfit.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const traderSplitFormatted = `₦${traderSplit.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const companySplitFormatted = `₦${companySplit.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const templatePath = path.join(this.getTemplatesDir(), 'payout-certificate-template.jpg');
    const fileName = `${certificateId}.jpg`;
    const genDirs = this.getGeneratedDirs();
    const outputPath = path.join(genDirs[0] || process.cwd(), fileName);

    // Title Case (small letters with capital first letters, matching 'Giant' typography)
    const cleanName = this.toTitleCase(params.recipientName);
    // Reduced font size by 4 points as requested to fit perfectly inside designated lines
    const nameFontSize = cleanName.length > 28 ? 22 : cleanName.length > 20 ? 26 : 30;
    const amountFontSize = formattedAmount.length > 18 ? 24 : formattedAmount.length > 14 ? 28 : 32;

    // Granular scan:
    // Name line begins at x=106, ends at x=569 (width = 463px), y=371
    // Profit Split line begins at x=105, ends at x=575 (width = 470px), y=484
    // Font: exact typography of 'Giants', normal weight (not bold), cleanly fits inside line width
    const overlaySvg = `
      <svg width="1024" height="723" viewBox="0 0 1024 723" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .trader-name {
              font-family: 'Plus Jakarta Sans', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-weight: 500;
              fill: #FFFFFF;
            }
            .profit-split {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-weight: 600;
              fill: #FFFFFF;
            }
            .date-text {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-weight: 500;
              fill: #FFFFFF;
              letter-spacing: 0.5px;
            }
            .cert-id {
              font-family: 'Courier New', 'Consolas', monospace;
              font-weight: 600;
              fill: #FFFFFF;
              letter-spacing: 1px;
            }
            .pill-text {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-size: 11px;
              font-weight: 700;
              fill: #E6FFFA;
              letter-spacing: 0.2px;
            }
          </style>
        </defs>

        <!-- 1. Trader Name placed cleanly inside line width in Title Case, not bold -->
        <text x="106" y="358" font-size="${nameFontSize}" class="trader-name">${cleanName}</text>

        <!-- 2. Profit Split full amount placed cleanly inside line width -->
        <text x="105" y="472" font-size="${amountFontSize}" class="profit-split">${formattedAmount}</text>

        <!-- 3. Date right below Profit Split section, placed on Date line at y=531 -->
        <text x="160" y="527" font-size="16" class="date-text">${issueDate}</text>

        <!-- 4. Certificate ID right below Date line -->
        <text x="110" y="562" font-size="14" class="cert-id">CERTIFICATE ID: ${certificateId}</text>

        <!-- 5. Throne Jewel Badges (Full Disbursed Amounts with Reduced Font to cleanly fit inside the pill) -->
        <!-- Top Right Badge: Total Profit -->
        <rect x="725" y="546" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
        <circle cx="743" cy="565" r="4" fill="#10B981"/>
        <text x="754" y="569" class="pill-text">${totalProfitFormatted}</text>

        <!-- Left Badge: Trader Split -->
        <rect x="605" y="602" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
        <circle cx="623" cy="621" r="4" fill="#10B981"/>
        <text x="634" y="625" class="pill-text">${traderSplitFormatted}</text>

        <!-- Bottom Right Badge: Company Split -->
        <rect x="780" y="602" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
        <circle cx="798" cy="621" r="4" fill="#10B981"/>
        <text x="809" y="625" class="pill-text">${companySplitFormatted}</text>
      </svg>
    `;

    try {
      const baseBuffer = this.payoutTemplateBuffer || fs.readFileSync(templatePath);
      const imageBuffer = await sharp(baseBuffer)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .jpeg({ quality: 95 })
        .toBuffer();

      for (const dir of genDirs) {
        try {
          fs.writeFileSync(path.join(dir, fileName), imageBuffer);
        } catch (e: any) {}
      }

      this.logger.log(`Generated Payout Certificate ${certificateId} for ${cleanName} (${formattedAmount})`);

      const apiBase = (process.env.API_BASE_URL || process.env.API_URL || 'https://api.fundedgiants.ng').replace(/\/+$/, '');
      const certificateUrl = `${apiBase}/api/v1/certificates/file/${fileName}`;

      // Dispatch payout record to WordPress live payout tracker & validation system
      await this.syncPayoutToWordPress({
        accountNumber: params.accountNumber,
        email: params.userEmail || '',
        name: cleanName,
        approvedAmount: params.amountNgn,
        certificateId,
        certificateUrl,
      });

      return {
        certificateId,
        type: 'PAYOUT',
        filePath: outputPath,
        publicUrl: certificateUrl,
        issueDate,
        recipientName: cleanName,
        amountNgn: params.amountNgn,
      };
    } catch (err: any) {
      this.logger.error(`Failed to generate payout certificate: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Send approved payout and certificate validation data to WordPress Payout Tracker
   */
  async syncPayoutToWordPress(data: {
    accountNumber: string;
    email: string;
    name: string;
    approvedAmount: number;
    certificateId: string;
    certificateUrl: string;
  }) {
    const wpBase =
      process.env.WOOCOMMERCE_API_URL?.replace(/\/wp-json\/wc\/v3\/?$/, '') ||
      process.env.WORDPRESS_URL ||
      'https://fundedgiants.ng';
    const wpApiUrl = `${wpBase}/wp-json/fundedgiants/v1/payout`;

    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const names = data.name.split(' ');
    const firstName = names[0] || 'Trader';
    const lastName = names.slice(1).join(' ') || '';

    const payload = {
      payout_id: data.certificateId,
      mt5_id: data.accountNumber,
      account_number: data.accountNumber,
      email: data.email,
      first_name: firstName,
      last_name: lastName,
      trader_name: data.name,
      requested_amount: data.approvedAmount,
      requested_at: nowFormatted,
      approved_amount: data.approvedAmount,
      amount_ngn: data.approvedAmount,
      approved_at: nowFormatted,
      payout_method: 'Giants Vault',
      sent_at: nowFormatted,
      certificate_id: data.certificateId,
      certificate_url: data.certificateUrl,
      timestamp: new Date().toISOString(),
    };

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'fg_live_webhook_secret_key';
      const body = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FG-WEBHOOK-TOKEN': process.env.FG_PAYOUT_WEBHOOK_TOKEN || 'fg-payout-sync-token-2026',
          'X-FGT-Signature': signature,
        },
        body,
      });

      if (response.ok) {
        this.logger.log(`Successfully synced payout ${data.certificateId} to WordPress payout tracker (${wpApiUrl})`);
      } else {
        const respText = await response.text().catch(() => '');
        this.logger.warn(`WordPress payout tracker sync returned status ${response.status}: ${respText}`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not reach WordPress payout tracker (${err.message}) - record preserved locally.`);
    }
  }

  /**
   * Get user certificates for portal display
   */
  async getUserCertificates(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tradingAccounts: true,
        challenges: {
          include: { product: true, tradingAccount: true },
        },
      },
    });

    if (!user) return [];

    const fullName = `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim();
    const certificates: any[] = [];
    const apiBase = (process.env.API_BASE_URL || process.env.API_URL || 'https://api.fundedgiants.ng').replace(/\/+$/, '');

    // 1. Completion certificates for passed challenges
    for (const challenge of user.challenges) {
      if (challenge.status === 'PASSED' || challenge.status === 'COMPLETED') {
        const certId = `FG-CERT-${challenge.challengeNumber.replace(/[^0-9]/g, '') || challenge.id.slice(0, 5)}`;
        const issueDate = challenge.passedAt
          ? new Date(challenge.passedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const fileName = `${certId}.jpg`;

        // Check if file exists, if not generate on demand
        const exists = this.findCertificateFile(fileName);
        if (!exists) {
          try {
            await this.generateCompletionCertificate({
              recipientName: fullName,
              accountNumber: challenge.tradingAccount?.accountNumber || challenge.challengeNumber,
              customCertId: certId,
            });
          } catch (e: any) {
            this.logger.warn(`Could not on-demand generate completion certificate: ${e.message}`);
          }
        }

        const certUrl = `${apiBase}/api/v1/certificates/file/${fileName}`;
        certificates.push({
          id: certId,
          certificateNumber: certId,
          type: 'COMPLETION',
          title: 'RHINO RUSH COMPLETION',
          subtitle: 'OFFICIAL FUNDED GIANT',
          program: 'Rhino Rush (1 Step)',
          recipientName: fullName,
          accountNumber: challenge.tradingAccount?.accountNumber || challenge.challengeNumber,
          planName: 'Rhino Rush (1 Step)',
          capitalSizeNgn: Number(challenge.product?.accountSize || (challenge as any).accountSizeNgn || 5000000),
          issueDate,
          certificateUrl: certUrl,
          imageUrl: certUrl,
          verificationUrl: `https://fundedgiants.ng/#payouts`,
          verificationHash: `0x${Buffer.from(certId).toString('hex')}`,
        });
      }
    }

    // 2. Payout certificates for approved payouts recorded in RiskEvents / Deposits strictly for this user
    const userAccountIds = Array.from(new Set([
      ...(user.tradingAccounts || []).map((a) => a.id),
      ...(user.challenges || []).map((c) => c.tradingAccount?.id).filter(Boolean) as string[],
    ]));

    const payouts = await prisma.riskEvent.findMany({
      where: {
        eventType: 'AUTOMATED_PAYOUT_APPROVED',
        OR: [
          { challenge: { userId: user.id } },
          { tradingAccount: { userId: user.id } },
          { tradingAccountId: { in: userAccountIds } },
        ],
      },
      include: {
        tradingAccount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const payout of payouts) {
      const payoutCertId = `FG-PAY-${payout.id.slice(0, 6).toUpperCase()}`;
      const issueDate = new Date(payout.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const match = payout.description.match(/₦([\d,]+)/);
      const payoutAmount = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
      const fileName = `${payoutCertId}.jpg`;

      // Check if file exists, if not generate on demand
      const exists = this.findCertificateFile(fileName);
      if (!exists) {
        try {
          await this.generatePayoutCertificate({
            recipientName: fullName,
            amountNgn: payoutAmount,
            accountNumber: payout.tradingAccount?.accountNumber || 'FG-ACCOUNT',
            userEmail: user.email || '',
            customCertId: payoutCertId,
          });
        } catch (e: any) {
          this.logger.warn(`Could not on-demand generate payout certificate: ${e.message}`);
        }
      }

      const certUrl = `${apiBase}/api/v1/certificates/file/${fileName}`;
      certificates.push({
        id: payoutCertId,
        certificateNumber: payoutCertId,
        type: 'PAYOUT',
        title: 'PAYOUT DISBURSEMENT',
        subtitle: 'PROFIT REWARD ISSUED',
        program: 'Funded Giant Trader',
        recipientName: fullName,
        accountNumber: payout.tradingAccount?.accountNumber || 'FG-ACCOUNT',
        planName: 'Funded Giant Trader',
        amount: payoutAmount,
        amountNgn: payoutAmount,
        issueDate,
        certificateUrl: certUrl,
        imageUrl: certUrl,
        verificationUrl: `https://fundedgiants.ng/#payouts`,
        verificationHash: `0x${Buffer.from(payoutCertId).toString('hex')}`,
      });
    }

    return certificates;
  }
}
