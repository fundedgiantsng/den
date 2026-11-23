const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function restamp() {
  const certificateId = 'FG-PAY-653F54';
  const recipientName = 'Favourable Esedeke';
  const amountNgn = 3495494.00;
  const issueDate = 'November 23, 2026';

  const cleanName = toTitleCase(recipientName);
  const formattedAmount = `₦${amountNgn.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const totalProfit = Math.round((amountNgn / 0.8) * 100) / 100;
  const traderSplit = amountNgn;
  const companySplit = Math.round((totalProfit - traderSplit) * 100) / 100;

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

  // Font size increased by an additional 5 points as requested (Total: +8 from original)
  const nameFontSize = 34;
  const amountFontSize = 36;

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

      <!-- 1. Trader Name placed cleanly inside line width in Title Case -->
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

  // Try finding template in possible directories
  const possibleTemplates = [
    path.join(__dirname, '../apps/api/assets/certificates/templates/payout-certificate-template.jpg'),
    path.join(__dirname, '../apps/trader-web/public/certificates/templates/payout-certificate-template.jpg'),
    '/var/www/fundedgiants/apps/api/assets/certificates/templates/payout-certificate-template.jpg',
    '/var/www/fundedgiants/apps/trader-web/public/certificates/templates/payout-certificate-template.jpg',
  ];

  let templatePath = null;
  for (const t of possibleTemplates) {
    if (fs.existsSync(t)) {
      templatePath = t;
      break;
    }
  }

  if (!templatePath) {
    console.error('Could not find template path!');
    process.exit(1);
  }

  console.log('Using template:', templatePath);
  const baseBuffer = fs.readFileSync(templatePath);
  const outputBuffer = await sharp(baseBuffer)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer();

  const targetDirs = [
    path.join(__dirname, '../apps/api/assets/certificates/generated'),
    path.join(__dirname, '../apps/trader-web/public/certificates/generated'),
    '/var/www/fundedgiants/apps/api/assets/certificates/generated',
    '/var/www/fundedgiants/apps/trader-web/public/certificates/generated',
    '/var/www/fundedgiants/apps/trader-web/.next/standalone/apps/trader-web/public/certificates/generated',
  ];

  for (const dir of targetDirs) {
    try {
      if (fs.existsSync(dir)) {
        const outPath = path.join(dir, `${certificateId}.jpg`);
        fs.writeFileSync(outPath, outputBuffer);
        console.log('Saved to:', outPath);
      }
    } catch (e) {
      console.warn('Could not write to', dir, e.message);
    }
  }

  console.log('Restamp complete!');
}

restamp().catch(console.error);
