#!/usr/bin/env node

/**
 * FundedGiants Nomba Live Banking & Dedicated Virtual Account Verification
 *
 * Usage:
 *   node scripts/test-nomba.mjs [CLIENT_ID] [PRIVATE_KEY] [ACCOUNT_ID]
 *
 * If no arguments are provided, it attempts to load from .env or interactively prompts in the terminal.
 * In-memory only: your keys will NOT be stored to disk or session logs.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for interactive terminal input
async function promptQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 1. Resolve credentials from argv, process.env, or .env
let clientId = process.argv[2] || process.env.NOMBA_CLIENT_ID;
let clientSecret = process.argv[3] || process.env.NOMBA_PRIVATE_KEY || process.env.NOMBA_CLIENT_SECRET;
let accountId = process.argv[4] || process.env.NOMBA_ACCOUNT_ID;

if (!clientId || !clientSecret || !accountId) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const matchClientId = envContent.match(/^NOMBA_CLIENT_ID="?([^"\r\n]+)"?$/m);
    const matchSecret = envContent.match(/^NOMBA_PRIVATE_KEY="?([^"\r\n]+)"?$/m) || envContent.match(/^NOMBA_CLIENT_SECRET="?([^"\r\n]+)"?$/m);
    const matchAccountId = envContent.match(/^NOMBA_ACCOUNT_ID="?([^"\r\n]+)"?$/m);

    if (matchClientId && matchClientId[1] && !clientId) clientId = matchClientId[1].trim();
    if (matchSecret && matchSecret[1] && !clientSecret) clientSecret = matchSecret[1].trim();
    if (matchAccountId && matchAccountId[1] && !accountId) accountId = matchAccountId[1].trim();
  }
}

const BASE_URL = process.env.NOMBA_BASE_URL || 'https://api.nomba.com';

console.log('===============================================================');
console.log('       FUNDEDGIANTS - NOMBA LIVE BANKING & WALLET TEST         ');
console.log('===============================================================');
console.log(`Endpoint Base URL: ${BASE_URL}`);

async function main() {
  if (!clientId) {
    clientId = await promptQuestion('\n🔑 Enter Nomba Client ID (from Nomba Dashboard): ');
  }
  if (!clientSecret) {
    clientSecret = await promptQuestion('🔑 Enter Nomba Private Key / Client Secret: ');
  }
  if (!accountId) {
    accountId = await promptQuestion('🔑 Enter Nomba Parent Account ID (UUID / Account ID): ');
  }

  if (!clientId || !clientSecret || !accountId) {
    console.error('\n❌ ERROR: All 3 Nomba credentials (Client ID, Private Key, Account ID) are required!');
    process.exit(1);
  }

  const mask = (s) => (s && s.length > 8 ? `${s.slice(0, 4)}...${s.slice(-4)}` : '••••');
  console.log('\nActive Credentials (in-memory):');
  console.log(`• Client ID:   ${mask(clientId)}`);
  console.log(`• Private Key: ${mask(clientSecret)}`);
  console.log(`• Account ID:  ${accountId}\n`);

  // -----------------------------------------------------------------
  // STEP 1: OAuth 2.0 Token Generation
  // -----------------------------------------------------------------
  console.log('[1/3] Testing OAuth 2.0 Token Handshake (POST /v1/auth/token/issue)...');
  const t0 = Date.now();
  let accessToken = null;

  try {
    const resAuth = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accountId: accountId,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const latency = Date.now() - t0;
    console.log(`HTTP Status: ${resAuth.status} ${resAuth.statusText} (${latency}ms)`);

    const authData = await resAuth.json().catch(() => ({}));

    if (!resAuth.ok || (!authData.access_token && !authData.data?.access_token)) {
      console.error(`❌ Authentication failed:`, JSON.stringify(authData, null, 2));
      console.log('\nTroubleshooting Checklist:');
      console.log('1. Verify your Client ID, Private Key, and Account ID.');
      console.log('2. Ensure your Nomba account is activated for Live API access.');
      process.exit(1);
    }

    accessToken = authData.access_token || authData.data?.access_token;
    const expiresIn = authData.expires_in || authData.data?.expires_in || 3600;

    console.log('✅ OAuth 2.0 Authentication Successful!');
    console.log(`• Token Type: Bearer`);
    console.log(`• Expires In: ${expiresIn} seconds (~${Math.round(expiresIn / 60)} minutes)`);
  } catch (err) {
    console.error('❌ Network error connecting to Nomba:', err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // STEP 2: Dedicated Virtual Account Creation Test
  // -----------------------------------------------------------------
  console.log('\n[2/3] Dedicated Virtual Account Creation Test...');
  const autoConfirm = process.argv.includes('-y') || process.argv.includes('--yes');
  let proceedAccount = autoConfirm;

  if (!autoConfirm) {
    const ans = await promptQuestion('👉 Do you want to test creating a live Dedicated Virtual Account on Nomba? (Y/n): ');
    proceedAccount = ans.toLowerCase() !== 'n' && ans.toLowerCase() !== 'no';
  }

  if (proceedAccount) {
    const testAccountRef = `FG-TEST-VA-${Date.now()}`;
    const customerFirstName = 'Favourable';
    const customerLastName = 'Esedeke';
    const customerFullName = `${customerFirstName} ${customerLastName}`;

    // Nomba requires: accountRef, accountName (only first & last name; Nomba prefixes brand name), currency
    const virtualAccountPayload = {
      accountRef: testAccountRef,
      accountName: customerFullName,
      currency: 'NGN',
    };

    console.log(`Sending virtual account creation request for: "${customerFullName}"...`);

    try {
      const resVA = await fetch(`${BASE_URL}/v1/accounts/virtual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          accountId: accountId,
        },
        body: JSON.stringify(virtualAccountPayload),
      });

      console.log(`HTTP Status: ${resVA.status} ${resVA.statusText}`);
      const vaData = await resVA.json().catch(() => ({}));

      if (!resVA.ok || (vaData.status === false && vaData.code !== '00')) {
        console.error('❌ Virtual Account creation returned error:');
        console.log(JSON.stringify(vaData, null, 2));
      } else {
        console.log('✅ Dedicated Virtual Account Created Successfully!');
        console.log('Raw Response:');
        console.dir(vaData, { depth: null, colors: true });

        const d = vaData.data || vaData;
        console.log('\n---------------------------------------------------');
        console.log('PROVISIONED VIRTUAL ACCOUNT DETAILS:');
        console.log(`• Bank Name:       ${d.bankName || 'Nomba Bank / Partner MFB'}`);
        console.log(`• Account Number:  ${d.bankAccountNumber || d.accountNumber}`);
        console.log(`• Account Name:    ${d.bankAccountName || d.accountName}`);
        console.log(`• Currency:        ${d.currency || 'NGN'}`);
        console.log(`• Account Ref:     ${d.accountRef || testAccountRef}`);
        console.log('---------------------------------------------------');
        console.log('Any funds sent to this account number will trigger the Nomba Webhook');
        console.log('and automatically credit the user wallet in FundedGiants.');
      }
    } catch (err) {
      console.error('❌ Error during virtual account creation:', err.message);
    }
  } else {
    console.log('Skipping virtual account creation as requested.');
  }

  // -----------------------------------------------------------------
  // STEP 3: Bank Account Lookup (Name Enquiry) Test
  // -----------------------------------------------------------------
  console.log('\n[3/3] Outbound Bank Account Resolution (Name Enquiry) Test...');
  let testResolve = autoConfirm;
  if (!autoConfirm) {
    const ans = await promptQuestion('👉 Do you want to test bank account lookup (name enquiry)? (y/N): ');
    testResolve = ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes';
  }

  if (testResolve) {
    const testAccNum = await promptQuestion('Enter 10-digit Nigerian Account Number to look up: ');
    const testBankCode = await promptQuestion('Enter 3-digit CBN Bank Code (e.g. 044 for Access, 058 for GTBank, 011 for First Bank): ');

    if (testAccNum && testBankCode) {
      try {
        const resLookup = await fetch(`${BASE_URL}/v1/transfers/bank/lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            accountId: accountId,
          },
          body: JSON.stringify({
            accountNumber: testAccNum,
            bankCode: testBankCode,
          }),
        });

        const lookupData = await resLookup.json().catch(() => ({}));
        if (resLookup.ok && lookupData.data?.accountName) {
          console.log(`✅ Bank Resolution Successful!`);
          console.log(`• Resolved Account Name: ${lookupData.data.accountName}`);
          console.log(`• Bank Code:             ${lookupData.data.bankCode || testBankCode}`);
        } else {
          console.log(`⚠️ Bank lookup returned:`, JSON.stringify(lookupData, null, 2));
        }
      } catch (err) {
        console.error('❌ Bank lookup failed:', err.message);
      }
    }
  }

  console.log('\n===============================================================');
  console.log('                   NOMBA WEBHOOK SETUP GUIDE                  ');
  console.log('===============================================================');
  console.log('In your Nomba Dashboard (Settings > Webhooks):');
  console.log('1. Set Webhook URL to:');
  console.log('   https://api.fundedgiants.ng/api/v1/webhooks/nomba');
  console.log('2. Copy the Webhook Secret from Nomba into Admin Dashboard Settings.');
  console.log('   (Used to HMAC-SHA256 verify incoming credit alerts).');
  console.log('===============================================================\n');
}

main();
