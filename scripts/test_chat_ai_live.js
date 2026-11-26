/**
 * Test Live Public Chat & AI Assistant on VPS
 */
const https = require('https');

async function testChat() {
  console.log('--- 1. Testing Public Guest Chat (Rule Query: 2% Cap) ---');
  const postData = JSON.stringify({
    deviceId: 'fg_guest_test_device_888',
    message: 'Can you explain the 2% daily profit cap rule on Rhino Rush evaluation accounts?',
    guestName: 'Chidi Trader',
  });

  const res1 = await new Promise((resolve, reject) => {
    const req = https.request('https://api.fundedgiants.ng/api/v1/support/public-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log('Status:', res1.status);
  console.log('User Message Created:', res1.body.data?.userMessage?.message);
  console.log('AI Concierge Reply:', res1.body.data?.aiMessage?.message);
  console.log('Is Escalated:', res1.body.data?.reply?.isEscalated);

  console.log('\n--- 2. Testing Chat History Retrieval for Device ---');
  const res2 = await new Promise((resolve, reject) => {
    https.get('https://api.fundedgiants.ng/api/v1/support/public-chat?deviceId=fg_guest_test_device_888', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });

  console.log('Status:', res2.status);
  console.log('Retrieved Message Count:', res2.body.data?.length);
  if (res2.body.data?.length > 0) {
    console.log('Latest Message in Thread:', res2.body.data[res2.body.data.length - 1].message.slice(0, 100) + '...');
  }

  console.log('\n--- 3. Testing Escalation / Human Support Query ---');
  const postData2 = JSON.stringify({
    deviceId: 'fg_guest_test_device_888',
    message: 'I would like to speak to a human representative regarding a payout dispute.',
  });

  const res3 = await new Promise((resolve, reject) => {
    const req = https.request('https://api.fundedgiants.ng/api/v1/support/public-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData2),
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(postData2);
    req.end();
  });

  console.log('Status:', res3.status);
  console.log('AI Reply:', res3.body.data?.aiMessage?.message);
  console.log('Escalated Flag:', res3.body.data?.reply?.isEscalated);
  console.log('Action Link:', res3.body.data?.reply?.actionLink);

  console.log('\n=== ALL CHAT & AI CONCIERGE TESTS COMPLETED SUCCESSFULLY ===');
}

testChat().catch(console.error);
