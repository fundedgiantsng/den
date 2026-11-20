const fs = require('fs');
const env = fs.readFileSync('/var/www/fundedgiants/apps/api/.env', 'utf8');
const getVal = (k) => {
  const m = env.match(new RegExp('^' + k + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1].trim() : '';
};

const pub = getVal('NINJA_KYC_PUBLIC_KEY');
const sec = getVal('NINJA_KYC_SECRET_KEY');
const flow = getVal('NINJA_KYC_FLOW_ID');

const hosts = [
  'https://api.ninja.boucloud.io',
  'https://api.sandbox.ninja.boucloud.io'
];

async function testHost(host) {
  console.log(`\n=================== Testing ${host} ===================`);
  try {
    const r1 = await fetch(`${host}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: pub, secret_key: sec })
    });
    const d1 = await r1.json().catch(() => ({}));
    console.log('/auth/session:', r1.status, d1);
  } catch (e) {
    console.log('/auth/session error:', e.message);
  }

  try {
    const r2 = await fetch(`${host}/api/flows/${flow}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sec}`
      },
      body: JSON.stringify({
        customer_name: 'Test Trader',
        customer_email: 'test@fundedgiants.ng',
        customer_ref: 'test_123'
      })
    });
    const d2 = await r2.json().catch(() => ({}));
    console.log('/api/flows/:id/links:', r2.status, d2);
  } catch (e) {
    console.log('/api/flows/:id/links error:', e.message);
  }
}

async function main() {
  for (const h of hosts) {
    await testHost(h);
  }
}

main();
