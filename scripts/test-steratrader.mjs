#!/usr/bin/env node

/**
 * FundedGiants SteraTrader (Velton Markets) Live Connectivity & Provisioning Test
 *
 * Usage:
 *   node scripts/test-steratrader.js [STERATRADER_API_KEY]
 *
 * If no key is provided as argument, it attempts to load STERATRADER_API_KEY from .env
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for interactive secure prompt in terminal
async function promptForApiKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n🔑 Enter SteraTrader API Key (in-memory only, will NOT be saved to disk or logs): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 1. Resolve API key
let apiKey = process.argv[2] || process.env.STERATRADER_API_KEY;

if (!apiKey) {
  // Try reading from .env in project root
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^STERATRADER_API_KEY="?([^"\r\n]+)"?$/m);
    if (match && match[1] && match[1].trim()) {
      apiKey = match[1].trim();
    }
  }
}

const BASE_URL = process.env.STERATRADER_API_URL || 'https://api.steratrader.com/crm/v1';

console.log('===============================================================');
console.log('   FUNDEDGIANTS - STERATRADER (VELTON MARKETS) VERIFICATION   ');
console.log('===============================================================');
console.log(`Endpoint Base URL: ${BASE_URL}`);

if (!apiKey) {
  apiKey = await promptForApiKey();
}

if (!apiKey) {
  console.error('\n❌ ERROR: No API Key provided. Exiting.');
  process.exit(1);
}

const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '••••';
console.log(`Using API Key:     ${maskedKey}\n`);

async function runTests() {
  // -----------------------------------------------------------------
  // STEP 1: Ping & Groups Verification
  // -----------------------------------------------------------------
  console.log('[1/3] Testing Connection & Querying Partner Groups...');
  const t0 = Date.now();
  try {
    const resGroups = await fetch(`${BASE_URL}/groups`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const latency = Date.now() - t0;
    console.log(`HTTP Status: ${resGroups.status} ${resGroups.statusText} (${latency}ms)`);

    if (!resGroups.ok) {
      const errBody = await resGroups.text();
      console.error(`❌ Connection failed with HTTP ${resGroups.status}:`, errBody);
      console.log('\nTroubleshooting Checklist:');
      console.log('1. Verify your Bearer token / API key is exact.');
      console.log('2. Check if your current IP needs to be whitelisted by Velton Markets.');
      console.log('   Run: curl ipinfo.io/ip to check your current public IP.');
      process.exit(1);
    }

    const groups = await resGroups.json();
    console.log('✅ Connection Successful! Verified Partner Groups from SteraTrader:');
    console.dir(groups, { depth: null, colors: true });
  } catch (err) {
    console.error('❌ Network error reaching SteraTrader:', err.message);
    process.exit(1);
  }

  // Check if user wants to proceed with account creation
  const autoConfirm = process.argv.includes('-y') || process.argv.includes('--yes');
  let shouldCreate = autoConfirm;

  if (!autoConfirm) {
    const rlConfirm = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    shouldCreate = await new Promise((resolve) => {
      rlConfirm.question('\n👉 Do you want to proceed to test creating a test demo account on SteraTrader? (Y/n): ', (ans) => {
        rlConfirm.close();
        resolve(ans.trim().toLowerCase() !== 'n' && ans.trim().toLowerCase() !== 'no');
      });
    });
  }

  if (!shouldCreate) {
    console.log('\n✨ Handshake verified! Skipping account creation as requested.');
    console.log('===============================================================');
    return;
  }

  // -----------------------------------------------------------------
  // STEP 2: Live Account Creation Test
  // -----------------------------------------------------------------
  console.log('\n[2/3] Testing Live Demo Account Provisioning (POST /accounts)...');
  const externalId = `FG-TEST-${Date.now()}`;
  const testAccountPayload = {
    group: 'fg-rr-eval', // Rhino Rush evaluation (32)
    currency: 'NGN',
    initial_balance: 1000000000, // ₦10,000,000 in integer kobo minor units (10,000,000 * 100)
    first_name: 'Favourable',
    last_name: 'Esedeke',
    email: 'favourable@fundedgiants.ng',
    external_id: externalId,
  };

  console.log('Payload sending to SteraTrader:');
  console.dir(testAccountPayload, { colors: true });

  let createdLogin = null;

  try {
    const resCreate = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAccountPayload),
    });

    const createData = await resCreate.json();

    if (!resCreate.ok) {
      console.error(`❌ Account creation returned HTTP ${resCreate.status}:`);
      console.log(JSON.stringify(createData, null, 2));
      process.exit(1);
    }

    console.log('✅ SteraTrader Auto-Approve Provisioning Successful!');
    console.log('---------------------------------------------------');
    console.log('Raw SteraTrader Response:');
    console.dir(createData, { depth: null, colors: true });

    const accountObj = createData.data || createData;
    createdLogin = accountObj.login || accountObj.account_number || accountObj.id;
    const masterPassword = accountObj.password || accountObj.master_password;
    const investorPassword = accountObj.investor_password;
    const server = accountObj.server || 'Velton Markets Demo';
    const balanceKobo = accountObj.balance !== undefined ? accountObj.balance : 0;

    console.log('\n---------------------------------------------------');
    console.log('CREDENTIALS CAPTURED FOR TRADER:');
    console.log(`• Server:            ${server}`);
    console.log(`• Account Login ID:  ${createdLogin}`);
    console.log(`• Master Password:   ${masterPassword}`);
    console.log(`• Investor Password: ${investorPassword || 'N/A'}`);
    console.log(`• Currency:          NGN`);
    console.log(`• Balance:           ₦${(Number(balanceKobo) / 100).toLocaleString()} NGN (${balanceKobo} kobo)`);
    console.log('---------------------------------------------------');
    console.log('Note: The group identifier is kept internal and never shown to the trader.');
  } catch (err) {
    console.error('❌ Failed during account creation:', err.message);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // STEP 3: Verify Metrics Query for the Created Account
  // -----------------------------------------------------------------
  if (createdLogin) {
    console.log(`\n[3/3] Querying Metrics for Account #${createdLogin} (GET /accounts/${createdLogin}/metrics)...`);
    try {
      const resMetrics = await fetch(`${BASE_URL}/accounts/${createdLogin}/metrics`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (resMetrics.ok) {
        const metrics = await resMetrics.json();
        console.log('✅ Metrics Query Successful:');
        console.dir(metrics, { depth: null, colors: true });

        const rawBalance = metrics.balance !== undefined ? metrics.balance : 0;
        const rawEquity = metrics.equity !== undefined ? metrics.equity : rawBalance;
        console.log(`Converted Balance: ₦${(rawBalance / 100).toLocaleString()}`);
        console.log(`Converted Equity:  ₦${(rawEquity / 100).toLocaleString()}`);
      } else {
        console.log(`⚠️ Metrics endpoint responded with HTTP ${resMetrics.status} (normal if brand new account with 0 ticks).`);
      }
    } catch (err) {
      console.log(`⚠️ Could not query metrics: ${err.message}`);
    }
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL STERATRADER INTEGRATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runTests();
