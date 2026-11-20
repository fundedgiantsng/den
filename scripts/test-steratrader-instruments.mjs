import fs from 'fs';

let API_KEY = process.env.STERATRADER_API_KEY;
let API_URL = process.env.STERATRADER_API_URL || 'https://api.steratrader.com/crm/v1';

if (!API_KEY && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/^STERATRADER_API_KEY="?([^"\r\n]+)"?$/m);
  if (match) API_KEY = match[1].trim();
  const matchUrl = envContent.match(/^STERATRADER_API_URL="?([^"\r\n]+)"?$/m);
  if (matchUrl) API_URL = matchUrl[1].trim();
}

console.log('Testing SteraTrader Instruments Fetch...');
console.log('API URL:', API_URL);
console.log('API KEY exists:', !!API_KEY);

async function fetchInstruments() {
  if (!API_KEY) {
    console.log('No STERATRADER_API_KEY found in .env');
    return;
  }

  // 1. Fetch /whoami
  try {
    const whoRes = await fetch(`${API_URL}/whoami`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    console.log('GET /whoami status:', whoRes.status);
    const whoData = await whoRes.json().catch(() => ({}));
    console.log('whoami data:', JSON.stringify(whoData, null, 2));
  } catch (e) {
    console.log('whoami error:', e.message);
  }

  // 2. Fetch /groups
  let groups = [];
  try {
    const groupRes = await fetch(`${API_URL}/groups`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    console.log('GET /groups status:', groupRes.status);
    const groupData = await groupRes.json().catch(() => ({}));
    console.log('groups data:', JSON.stringify(groupData, null, 2));
    groups = groupData.data || groupData.groups || (Array.isArray(groupData) ? groupData : []);
  } catch (e) {
    console.log('groups error:', e.message);
  }

  // 3. Fetch /instruments
  try {
    const instRes = await fetch(`${API_URL}/instruments`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    console.log('GET /instruments status:', instRes.status);
    const instData = await instRes.json().catch(() => ({}));
    const list = instData.data || (Array.isArray(instData) ? instData : []);
    console.log('instruments count:', list.length);
    if (list.length > 0) {
      console.log('Sample instruments (first 10):', JSON.stringify(list.slice(0, 10), null, 2));
      fs.writeFileSync('scripts/steratrader_instruments_catalogue.json', JSON.stringify(list, null, 2));
    } else {
      console.log('Raw instData:', JSON.stringify(instData).substring(0, 500));
    }
  } catch (e) {
    console.log('instruments error:', e.message);
  }

  // 4. If groups exist, fetch /groups/{group_id}/instruments
  if (groups.length > 0) {
    const gId = groups[0].id || groups[0].slug || 1;
    try {
      const gInstRes = await fetch(`${API_URL}/groups/${gId}/instruments`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      console.log(`GET /groups/${gId}/instruments status:`, gInstRes.status);
      const gInstData = await gInstRes.json().catch(() => ({}));
      const gList = gInstData.data || (Array.isArray(gInstData) ? gInstData : []);
      console.log('Group instruments count:', gList.length);
      if (gList.length > 0) {
        console.log('Sample group instrument terms (first 5):', JSON.stringify(gList.slice(0, 5), null, 2));
        fs.writeFileSync('scripts/steratrader_group_instruments.json', JSON.stringify(gList, null, 2));
      } else {
        console.log('Raw group instruments data:', JSON.stringify(gInstData).substring(0, 500));
      }
    } catch (e) {
      console.log('group instruments error:', e.message);
    }
  }
}

fetchInstruments().catch(console.error);
