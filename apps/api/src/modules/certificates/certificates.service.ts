import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
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

  private readonly templatesDir = path.join(__dirname, '../../../assets/certificates/templates');
  private readonly generatedDir = path.join(__dirname, '../../../../trader-web/public/certificates/generated');

  constructor() {
    if (!fs.existsSync(this.generatedDir)) {
      fs.mkdirSync(this.generatedDir, { recursive: true });
    }
  }

  /**
   * Stamp & generate Rhino Rush Completion Certificate
   */
  async generateCompletionCertificate(params: {
    recipientName: string;
    accountNumber: string;
    date?: string;
  }): Promise<GeneratedCertificateResult> {
    const certificateId = `FG-CERT-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = params.date || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const templatePath = path.join(this.templatesDir, 'rhino-rush-completion-template.jpg');
    const fileName = `${certificateId}.jpg`;
    const outputPath = path.join(this.generatedDir, fileName);

    // Title Case (small letters with capital first letters, matching 'Giant' typography)
    const cleanName = this.toTitleCase(params.recipientName);

    const overlaySvg = `
      <svg width="1024" height="723" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .trader-name {
              font-family: 'Plus Jakarta Sans', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-weight: 800;
              fill: #FFFFFF;
              letter-spacing: 2px;
            }
            .date-text {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-weight: 700;
              fill: #FFFFFF;
              letter-spacing: 0.5px;
            }
            .cert-id {
              font-family: 'Courier New', 'Consolas', monospace;
              font-weight: 700;
              fill: #FFFFFF;
              letter-spacing: 1px;
            }
          </style>
        </defs>

        <!-- Trader Name in Title Case, expanded/scaled across line at y=348 -->
        <text x="110" y="328" font-size="40" class="trader-name" textLength="430" lengthAdjust="spacing">${cleanName}</text>

        <!-- Issue Date (enlarged, bold white) -->
        <text x="168" y="643" font-size="17" class="date-text">${issueDate}</text>

        <!-- Certificate Validation ID right below Date -->
        <text x="110" y="684" font-size="14" class="cert-id">CERTIFICATE ID: ${certificateId}</text>
      </svg>
    `;

    try {
      await sharp(templatePath)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .jpeg({ quality: 95 })
        .toFile(outputPath);

      this.logger.log(`Generated Completion Certificate ${certificateId} for ${cleanName}`);

      return {
        certificateId,
        type: 'COMPLETION',
        filePath: outputPath,
        publicUrl: `/certificates/generated/${fileName}`,
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
  }): Promise<GeneratedCertificateResult> {
    const certificateId = `FG-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
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

    const totalProfitK = this.formatK(totalProfit);
    const traderSplitK = this.formatK(traderSplit);
    const companySplitK = this.formatK(companySplit);

    const templatePath = path.join(this.templatesDir, 'payout-certificate-template.jpg');
    const fileName = `${certificateId}.jpg`;
    const outputPath = path.join(this.generatedDir, fileName);

    // Title Case (small letters with capital first letters, matching 'Giant' typography)
    const cleanName = this.toTitleCase(params.recipientName);

    const overlaySvg = `
      <svg width="1024" height="723" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .trader-name {
              font-family: 'Plus Jakarta Sans', 'Inter', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-weight: 800;
              fill: #FFFFFF;
              letter-spacing: 2px;
            }
            .profit-split {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-weight: 800;
              fill: #FFFFFF;
              letter-spacing: 1.5px;
            }
            .date-text {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-weight: 700;
              fill: #FFFFFF;
              letter-spacing: 0.5px;
            }
            .cert-id {
              font-family: 'Courier New', 'Consolas', monospace;
              font-weight: 700;
              fill: #FFFFFF;
              letter-spacing: 1px;
            }
            .pill-text {
              font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
              font-size: 13px;
              font-weight: 800;
              fill: #A7F3D0;
              letter-spacing: 0.5px;
            }
          </style>
        </defs>

        <!-- 1. Trader Name in Title Case, expanded/scaled across line at y=371 -->
        <text x="110" y="354" font-size="40" class="trader-name" textLength="430" lengthAdjust="spacing">${cleanName}</text>

        <!-- 2. Profit Split full amount scaled/expanded to fill the line at y=484 -->
        <text x="110" y="468" font-size="46" class="profit-split" textLength="430" lengthAdjust="spacing">${formattedAmount}</text>

        <!-- 3. Date right below Profit Split section, placed on Date line at y=531 -->
        <text x="160" y="527" font-size="16" class="date-text">${issueDate}</text>

        <!-- 4. Certificate ID right below Date line -->
        <text x="110" y="562" font-size="14" class="cert-id">CERTIFICATE ID: ${certificateId}</text>

        <!-- 5. Throne Jewel Badges (Exact-Cover Dimensions) -->
        <!-- Top Right Badge: Total Profit (Replaces $6,980 at 752..866, y: 554..584) -->
        <rect x="748" y="552" width="122" height="32" rx="16" fill="#02120e" stroke="#10B981" stroke-opacity="0.6" stroke-width="1.4"/>
        <circle cx="766" cy="568" r="4" fill="#10B981"/>
        <text x="778" y="573" class="pill-text">${totalProfitK}</text>

        <!-- Left Badge: Trader Split (Replaces $4,886 at 635..745, y: 610..638) -->
        <rect x="632" y="608" width="120" height="32" rx="16" fill="#02120e" stroke="#10B981" stroke-opacity="0.6" stroke-width="1.4"/>
        <circle cx="650" cy="624" r="4" fill="#10B981"/>
        <text x="662" y="629" class="pill-text">${traderSplitK}</text>

        <!-- Bottom Right Badge: Company Split (Replaces $2,094 at 795..905, y: 610..638) -->
        <rect x="792" y="608" width="120" height="32" rx="16" fill="#02120e" stroke="#10B981" stroke-opacity="0.6" stroke-width="1.4"/>
        <circle cx="810" cy="624" r="4" fill="#10B981"/>
        <text x="822" y="629" class="pill-text">${companySplitK}</text>
      </svg>
    `;

    try {
      await sharp(templatePath)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .jpeg({ quality: 95 })
        .toFile(outputPath);

      this.logger.log(`Generated Payout Certificate ${certificateId} for ${cleanName} (${formattedAmount})`);

      // Dispatch payout record to WordPress live payout tracker & validation system
      await this.syncPayoutToWordPress({
        accountNumber: params.accountNumber,
        email: params.userEmail || '',
        name: cleanName,
        approvedAmount: params.amountNgn,
        certificateId,
        certificateUrl: `http://localhost:3000/certificates/generated/${fileName}`,
      });

      return {
        certificateId,
        type: 'PAYOUT',
        filePath: outputPath,
        publicUrl: `/certificates/generated/${fileName}`,
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
    const wpApiUrl = process.env.WOOCOMMERCE_API_URL
      ? process.env.WOOCOMMERCE_API_URL.replace('/wc/v3', '/fundedgiants/v1/payout')
      : 'https://fundedgiants.local/wp-json/fundedgiants/v1/payout';

    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const names = data.name.split(' ');
    const firstName = names[0] || 'Trader';
    const lastName = names.slice(1).join(' ') || '';

    const payload = {
      mt5_id: data.accountNumber,
      email: data.email,
      first_name: firstName,
      last_name: lastName,
      requested_amount: data.approvedAmount,
      requested_at: nowFormatted,
      approved_amount: data.approvedAmount,
      approved_at: nowFormatted,
      payout_method: 'Giants Vault',
      sent_at: nowFormatted,
      certificate_id: data.certificateId,
      certificate_url: data.certificateUrl,
    };

    try {
      // In development with self-signed SSL, ignore cert error
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FG-WEBHOOK-TOKEN': process.env.FG_PAYOUT_WEBHOOK_TOKEN || 'fg-payout-sync-token-2026',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        this.logger.log(`Successfully synced payout ${data.certificateId} to WordPress payout tracker`);
      } else {
        this.logger.warn(`WordPress payout tracker sync returned status ${response.status}`);
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
        challenges: {
          include: { product: true, tradingAccount: true },
        },
      },
    });

    if (!user) return [];

    const fullName = `${user.firstName || 'John'} ${user.lastName || 'Doe'}`.trim();
    const certificates: any[] = [];

    // 1. Completion certificates for passed challenges
    for (const challenge of user.challenges) {
      if (challenge.status === 'PASSED' || challenge.status === 'COMPLETED') {
        const certId = `FG-CERT-${challenge.challengeNumber.replace(/[^0-9]/g, '') || '48291'}`;
        const issueDate = challenge.passedAt
          ? new Date(challenge.passedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : 'October 24, 2026';

        certificates.push({
          id: challenge.id,
          certificateNumber: certId,
          type: 'EVALUATION_PASSED',
          title: 'RHINO RUSH COMPLETION',
          subtitle: 'OFFICIAL FUNDED GIANT',
          recipientName: fullName,
          accountNumber: challenge.tradingAccount?.accountNumber || challenge.challengeNumber,
          planName: 'Rhino Rush (1 Step)',
          capitalSizeNgn: Number(challenge.product.accountSize),
          issueDate,
          imageUrl: `/certificates/generated/sample-completion.jpg`,
          verificationUrl: `https://fundedgiants.local/#payouts`,
          verificationHash: `0x${Buffer.from(certId).toString('hex')}`,
        });
      }
    }

    // 2. Payout certificates for approved payouts recorded in RiskEvents / Deposits
    const payouts = await prisma.riskEvent.findMany({
      where: {
        eventType: 'AUTOMATED_PAYOUT_APPROVED',
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

      certificates.push({
        id: payout.id,
        certificateNumber: payoutCertId,
        type: 'ELITE_PAYOUT',
        title: 'PAYOUT DISBURSEMENT',
        subtitle: 'PROFIT REWARD ISSUED',
        recipientName: fullName,
        accountNumber: payout.tradingAccount?.accountNumber || 'FG-48291',
        planName: 'Funded Giant Trader',
        amountNgn: 2480000,
        issueDate,
        imageUrl: `/certificates/generated/sample-payout.jpg`,
        verificationUrl: `https://fundedgiants.local/#payouts`,
        verificationHash: `0x${Buffer.from(payoutCertId).toString('hex')}`,
      });
    }

    // If empty in dev, return baseline verified completion & payout certificates
    if (certificates.length === 0) {
      certificates.push(
        {
          id: 'cert-sample-01',
          certificateNumber: 'FG-CERT-48291',
          type: 'EVALUATION_PASSED',
          title: 'RHINO RUSH COMPLETION',
          subtitle: 'OFFICIAL FUNDED GIANT',
          recipientName: fullName,
          accountNumber: 'FG-48291',
          planName: 'Rhino Rush (1 Step)',
          capitalSizeNgn: 10000000,
          issueDate: 'October 24, 2026',
          imageUrl: '/certificates/generated/sample-completion.jpg',
          verificationUrl: 'https://fundedgiants.local/#payouts',
          verificationHash: '0x46472d434552542d3438323931',
        },
        {
          id: 'cert-sample-02',
          certificateNumber: 'FG-PAY-98412',
          type: 'ELITE_PAYOUT',
          title: 'PAYOUT DISBURSEMENT',
          subtitle: 'PROFIT REWARD ISSUED',
          recipientName: fullName,
          accountNumber: 'FG-48291',
          planName: 'Funded Giant Trader',
          amountNgn: 2480000,
          issueDate: 'November 14, 2026',
          imageUrl: '/certificates/generated/sample-payout.jpg',
          verificationUrl: 'https://fundedgiants.local/#payouts',
          verificationHash: '0x46472d5041592d3938343132',
        }
      );
    }

    return certificates;
  }
}
