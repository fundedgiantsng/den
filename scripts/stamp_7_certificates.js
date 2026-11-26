let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require('/var/www/fundedgiants/node_modules/.pnpm/sharp@0.35.5_@types+node@22.20.5/node_modules/sharp');
}
const fs = require('fs');
const path = require('path');

const templatePaths = [
  '/var/www/fundedgiants/apps/api/assets/certificates/templates/payout-certificate-template.jpg',
  '/var/www/fundedgiants/apps/trader-web/public/certificates/templates/payout-certificate-template.jpg',
  'c:/Users/USER/Documents/FundedGiants/apps/api/assets/certificates/templates/payout-certificate-template.jpg',
];

let templatePath = templatePaths.find((p) => fs.existsSync(p));
if (!templatePath) {
  console.error('Template not found in candidate paths!');
  process.exit(1);
}

const certs = [
  {
    name: 'Sarah Idiong',
    amount: 2160000,
    totalProfit: 2700000,
    certId: 'FG-PAY-819203',
    date: 'November 23, 2026',
  },
  {
    name: 'Ekom Udo',
    amount: 896000,
    totalProfit: 1120000,
    certId: 'FG-PAY-382910',
    date: 'November 23, 2026',
  },
  {
    name: 'Francis Bassey',
    amount: 4160000,
    totalProfit: 5200000,
    certId: 'FG-PAY-729401',
    date: 'November 24, 2026',
  },
  {
    name: 'George Nnamdi',
    amount: 464000,
    totalProfit: 580000,
    certId: 'FG-PAY-501928',
    date: 'November 25, 2026',
  },
  {
    name: 'Solomon Olufukeji',
    amount: 2120000,
    totalProfit: 2650000,
    certId: 'FG-PAY-619284',
    date: 'November 25, 2026',
  },
  {
    name: 'Adebayo Olumide',
    amount: 840000,
    totalProfit: 1050000,
    certId: 'FG-PAY-938102',
    date: 'November 26, 2026',
  },
  {
    name: 'Felix Egwuonwu',
    amount: 4400000,
    totalProfit: 5500000,
    certId: 'FG-PAY-402918',
    date: 'November 26, 2026',
  },
];

async function stampAll() {
  const outputDirs = [
    '/var/www/fundedgiants/apps/api/assets/certificates/generated',
    '/var/www/fundedgiants/apps/api/dist/assets/certificates/generated',
    '/var/www/fundedgiants/apps/trader-web/public/certificates/generated',
  ];

  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  for (const c of certs) {
    const cleanName = c.name;
    const formattedAmount = `₦${c.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalProfitFormatted = `₦${c.totalProfit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const traderSplitFormatted = formattedAmount;
    const companySplit = Math.max(0, c.totalProfit - c.amount);
    const companySplitFormatted = `₦${companySplit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <text x="160" y="527" font-size="${dateFontSize}" class="date-text">${c.date}</text>

        <!-- 4. Certificate ID -->
        <text x="110" y="562" font-size="14" class="cert-id">CERTIFICATE ID: ${c.certId}</text>

        <!-- 5. Throne Jewel Badges -->
        <rect x="725" y="546" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
        <circle cx="743" cy="565" r="4" fill="#10B981"/>
        <text x="754" y="570" class="pill-text">${totalProfitFormatted}</text>

        <rect x="605" y="602" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
        <circle cx="623" cy="621" r="4" fill="#10B981"/>
        <text x="634" y="626" class="pill-text">${traderSplitFormatted}</text>

        <rect x="780" y="602" width="165" height="38" rx="19" fill="#010e0b" stroke="#10B981" stroke-opacity="0.8" stroke-width="1.5"/>
        <circle cx="798" cy="621" r="4" fill="#10B981"/>
        <text x="809" y="626" class="pill-text">${companySplitFormatted}</text>
      </svg>
    `;

    const imageBuffer = await sharp(templatePath)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .jpeg({ quality: 95 })
      .toBuffer();

    for (const dir of outputDirs) {
      const outPath = path.join(dir, `${c.certId}.jpg`);
      fs.writeFileSync(outPath, imageBuffer);
    }
    console.log(`Stamped ${c.certId} for ${cleanName} (${formattedAmount})`);
  }
}

stampAll().catch(console.error);
