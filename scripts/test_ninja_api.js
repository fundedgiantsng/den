const fs = require('fs');
const env = fs.readFileSync('/var/www/fundedgiants/apps/api/.env', 'utf8');
const getVal = (k) => {
  const m = env.match(new RegExp('^' + k + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1].trim() : '';
};

const pub = getVal('NINJA_KYC_PUBLIC_KEY');
const sec = getVal('NINJA_KYC_SECRET_KEY');
const flow = getVal('NINJA_KYC_FLOW_ID');

console.log('Testing with Public:', pub ? pub.substring(0, 10) + '...' : 'empty');
console.log('Testing with Secret:', sec ? sec.substring(0, 10) + '...' : 'empty');
console.log('Testing with Flow:', flow);

async function run() {
  console.log('\n--- 1. Calling /auth/session ---');
  try {
    const res1 = await fetch('https://api.ninja.boucloud.io/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: pub, secret_key: sec })
    });
    const data1 = await res1.json().catch(() => ({}));
    console.log('/auth/session status:', res1.status, data1);
  } catch (e) {
    console.log('/auth/session error:', e.message);
  }

  console.log('\n--- 2. Calling /api/flows/:id/links with Bearer sec ---');
  try {
    const res2 = await fetch('https://api.ninja.boucloud.io/api/flows/' + flow + '/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sec
      },
      body: JSON.stringify({
        customer_name: 'Test Trader',
        customer_email: 'test@fundedgiants.ng',
        customer_ref: 'test_123'
      })
    });
    const data2 = await res2.json().catch(() => ({}));
    console.log('Links status:', res2.status, data2);
  } catch (e) {
    console.log('Links error:', e.message);
  }
}

run();
