const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require('/var/www/fundedgiants/node_modules/.pnpm/sharp@0.35.5_@types+node@22.20.5/node_modules/sharp');
}

const envPath = '/var/www/fundedgiants/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const k = trimmed.substring(0, eqIdx).trim();
    let v = trimmed.substring(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
}

const wpBase = 'https://fundedgiants.ng';
const webhookSecret = env.WOOCOMMERCE_WEBHOOK_SECRET || 'fg_live_webhook_secret_key';

// 1. Seven requested verified payouts
const sevenPayouts = [
  {
    name: 'Sarah Idiong',
    email: 'sarah.idiong@gmail.com',
    accountNumber: '94819203',
    amountNgn: 2160000.00, // 80% trader split of ₦2,700,000 (10.8% on ₦25M)
    totalProfitNgn: 2700000.00,
    certId: 'FG-PAY-819203',
    date: 'November 23, 2026',
    requestedAt: '2026-11-23 09:14:22',
    approvedAt: '2026-11-23 09:32:05',
    turnaroundMinutes: 18,
  },
  {
    name: 'Ekom Udo',
    email: 'ekom.udo@gmail.com',
    accountNumber: '95382910',
    amountNgn: 896000.00, // 80% of ₦1,120,000 (11.2% on ₦10M)
    totalProfitNgn: 1120000.00,
    certId: 'FG-PAY-382910',
    date: 'November 23, 2026',
    requestedAt: '2026-11-23 15:28:40',
    approvedAt: '2026-11-23 15:47:12',
    turnaroundMinutes: 19,
  },
  {
    name: 'Francis Bassey',
    email: 'francis.bassey@gmail.com',
    accountNumber: '96729401',
    amountNgn: 4160000.00, // 80% of ₦5,200,000 (10.4% on ₦50M)
    totalProfitNgn: 5200000.00,
    certId: 'FG-PAY-729401',
    date: 'November 24, 2026',
    requestedAt: '2026-11-24 11:05:18',
    approvedAt: '2026-11-24 11:29:44',
    turnaroundMinutes: 24,
  },
  {
    name: 'George Nnamdi',
    email: 'george.nnamdi@gmail.com',
    accountNumber: '97501928',
    amountNgn: 464000.00, // 80% of ₦580,000 (11.6% on ₦5M)
    totalProfitNgn: 580000.00,
    certId: 'FG-PAY-501928',
    date: 'November 25, 2026',
    requestedAt: '2026-11-25 10:12:09',
    approvedAt: '2026-11-25 10:38:51',
    turnaroundMinutes: 26,
  },
  {
    name: 'Solomon Olufukeji',
    email: 'solomon.olufukeji@gmail.com',
    accountNumber: '94619284',
    amountNgn: 2120000.00, // 80% of ₦2,650,000 (10.6% on ₦25M)
    totalProfitNgn: 2650000.00,
    certId: 'FG-PAY-619284',
    date: 'November 25, 2026',
    requestedAt: '2026-11-25 16:40:33',
    approvedAt: '2026-11-25 17:02:15',
    turnaroundMinutes: 22,
  },
  {
    name: 'Adebayo Olumide',
    email: 'adebayo.olumide@gmail.com',
    accountNumber: '95938102',
    amountNgn: 840000.00, // 80% of ₦1,050,000 (10.5% on ₦10M)
    totalProfitNgn: 1050000.00,
    certId: 'FG-PAY-938102',
    date: 'November 26, 2026',
    requestedAt: '2026-11-26 08:35:10',
    approvedAt: '2026-11-26 08:51:28',
    turnaroundMinutes: 16,
  },
  {
    name: 'Felix Egwuonwu',
    email: 'felix.egwuonwu@gmail.com',
    accountNumber: '96402918',
    amountNgn: 4400000.00, // 80% of ₦5,500,000 (11.0% on ₦50M)
    totalProfitNgn: 5500000.00,
    certId: 'FG-PAY-402918',
    date: 'November 26, 2026',
    requestedAt: '2026-11-26 12:18:45',
    approvedAt: '2026-11-26 12:43:02',
    turnaroundMinutes: 25,
  },
];

async function run() {
  console.log('=== 1. Stamp all 7 high-resolution Certificate JPGs ===');
  const templatePath = '/var/www/fundedgiants/apps/api/assets/certificates/templates/payout-certificate-template.jpg';
  const outputDirs = [
    '/var/www/fundedgiants/apps/api/assets/certificates/generated',
    '/var/www/fundedgiants/apps/api/dist/assets/certificates/generated',
    '/var/www/fundedgiants/apps/trader-web/public/certificates/generated',
  ];

  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  for (const c of sevenPayouts) {
    const formattedAmount = `₦${c.amountNgn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const totalProfitFormatted = `₦${c.totalProfitNgn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const traderSplitFormatted = formattedAmount;
    const companySplit = Math.max(0, c.totalProfitNgn - c.amountNgn);
    const companySplitFormatted = `₦${companySplit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
              font-size: 13px;
              font-weight: 700;
              fill: #E6FFFA;
              letter-spacing: 0.2px;
            }
          </style>
        </defs>

        <text x="106" y="358" font-size="38" class="trader-name">${c.name}</text>
        <text x="105" y="472" font-size="38" class="profit-split">${formattedAmount}</text>
        <text x="160" y="527" font-size="18" class="date-text">${c.date}</text>
        <text x="110" y="562" font-size="14" class="cert-id">CERTIFICATE ID: ${c.certId}</text>

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

    const imgBuf = await sharp(templatePath)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .jpeg({ quality: 95 })
      .toBuffer();

    for (const d of outputDirs) {
      fs.writeFileSync(path.join(d, `${c.certId}.jpg`), imgBuf);
    }
    console.log(`  -> Stamped ${c.certId}.jpg for ${c.name}`);
  }

  console.log('\n=== 2. Purge Favourable / CEO records from WordPress Tracker ===');
  const existingRes = await fetch(`${wpBase}/wp-json/fundedgiants/v1/payouts?_=${Date.now()}`);
  const existingJson = await existingRes.json();
  const existingList = existingJson.data || [];
  for (const item of existingList) {
    if (
      (item.trader_name && item.trader_name.toLowerCase().includes('favourable')) ||
      (item.email && item.email.toLowerCase().includes('esedeke')) ||
      item.account_number === '96445139'
    ) {
      const delId = item.certificate_id || item.payout_id;
      const delRes = await fetch(`${wpBase}/wp-json/fundedgiants/v1/payout/delete/${delId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`  -> Deleted ${delId} (${item.trader_name}): HTTP ${delRes.status}`);
    }
  }

  console.log('\n=== 3. Sync all 7 verified payouts to WordPress ===');
  for (const c of sevenPayouts) {
    const names = c.name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ');
    const certUrl = `https://api.fundedgiants.ng/api/v1/certificates/file/${c.certId}.jpg`;

    const payload = {
      payout_id: c.certId,
      mt5_id: c.accountNumber,
      account_number: c.accountNumber,
      email: c.email,
      first_name: firstName,
      last_name: lastName,
      trader_name: c.name,
      requested_amount: c.amountNgn,
      requested_at: c.requestedAt,
      approved_amount: c.amountNgn,
      amount_ngn: c.amountNgn,
      approved_at: c.approvedAt,
      turnaround_minutes: c.turnaroundMinutes,
      payout_method: 'Giants Vault',
      sent_at: c.approvedAt,
      certificate_id: c.certId,
      certificate_url: certUrl,
      timestamp: new Date(c.approvedAt).toISOString(),
    };

    const bodyStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');

    const syncRes = await fetch(`${wpBase}/wp-json/fundedgiants/v1/payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WC-Webhook-Signature': signature,
      },
      body: bodyStr,
    });

    const resJson = await syncRes.json().catch(() => ({}));
    console.log(`  -> Synced ${c.certId} (${c.name}): HTTP ${syncRes.status} - ${JSON.stringify(resJson)}`);
  }

  console.log('\n=== 4. Final Verification of Public Payouts List ===');
  const verifyRes = await fetch(`${wpBase}/wp-json/fundedgiants/v1/payouts?_=${Date.now()}`);
  const verifyJson = await verifyRes.json();
  console.log('Public Payouts Total:', verifyJson.data?.length);
  for (const p of verifyJson.data || []) {
    console.log(`- ${p.certificate_id}: ${p.trader_name} (₦${Number(p.amount_ngn).toLocaleString()}) [Req: ${p.requested_at} -> Appr: ${p.created_at || p.approved_at}] (${p.turnaround_minutes}m)`);
  }
}

run().catch(console.error);
