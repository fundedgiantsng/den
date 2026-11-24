let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require('/var/www/fundedgiants/node_modules/.pnpm/sharp@0.35.5_@types+node@22.20.5/node_modules/sharp');
}
const fs = require('fs');
const path = require('path');

async function main() {
  const templatePath = '/var/www/fundedgiants/apps/api/assets/certificates/templates/payout-certificate-template.jpg';
  if (!fs.existsSync(templatePath)) {
    console.error('Template not found at:', templatePath);
    process.exit(1);
  }

  const cleanName = 'Favourable Esedeke';
  const formattedAmount = '₦3,495,494.00';
  const certificateId = 'FG-PAY-653F54';
  const issueDate = 'November 23, 2026';

  const totalProfitFormatted = '₦4,369,368.00';
  const traderSplitFormatted = '₦3,495,494.00';
  const companySplitFormatted = '₦873,874.00';

  // Typography with latest +2pt updates requested:
  const nameFontSize = 38;
  const amountFontSize = 38;
  const dateFontSize = 18;
  const pillFontSize = 13;

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
            font-size: ${pillFontSize}px;
            font-weight: 700;
            fill: #E6FFFA;
            letter-spacing: 0.2px;
          }
        </style>
      </defs>

      <!-- 1. Trader Name -->
      <text x="106" y="358" font-size="${nameFontSize}" class="trader-name">${cleanName}</text>

      <!-- 2. Profit Split full amount -->
      <text x="105" y="472" font-size="${amountFontSize}" class="profit-split">${formattedAmount}</text>

      <!-- 3. Date -->
      <text x="160" y="527" font-size="${dateFontSize}" class="date-text">${issueDate}</text>

      <!-- 4. Certificate ID -->
      <text x="110" y="562" font-size="14" class="cert-id">CERTIFICATE ID: ${certificateId}</text>

      <!-- 5. Throne Jewel Badges -->
      <!-- Top Right Badge: Total Profit -->
      <rect x="725" y="546" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
      <circle cx="743" cy="565" r="4" fill="#10B981"/>
      <text x="754" y="570" class="pill-text">${totalProfitFormatted}</text>

      <!-- Left Badge: Trader Split -->
      <rect x="605" y="602" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
      <circle cx="623" cy="621" r="4" fill="#10B981"/>
      <text x="634" y="626" class="pill-text">${traderSplitFormatted}</text>

      <!-- Bottom Right Badge: Company Split -->
      <rect x="780" y="602" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
      <circle cx="798" cy="621" r="4" fill="#10B981"/>
      <text x="809" y="626" class="pill-text">${companySplitFormatted}</text>
    </svg>
  `;

  const outputPaths = [
    '/var/www/fundedgiants/apps/api/assets/certificates/generated/FG-PAY-653F54.jpg',
    '/var/www/fundedgiants/apps/api/dist/assets/certificates/generated/FG-PAY-653F54.jpg',
    '/var/www/html/wp-content/uploads/certificates/FG-PAY-653F54.jpg',
    '/var/www/fundedgiants.ng/wp-content/uploads/certificates/FG-PAY-653F54.jpg',
  ];

  const buffer = await sharp(templatePath)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer();

  for (const outPath of outputPaths) {
    try {
      const dir = path.dirname(outPath);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(outPath, buffer);
        console.log('Stamped and written to:', outPath);
      }
    } catch (e) {
      console.warn('Could not write to', outPath, e.message);
    }
  }

  console.log('Restamp complete with updated typography: Amount +2pt (38px), Date +2pt (18px), Pills +2pt (13px)');
}

main().catch(console.error);
