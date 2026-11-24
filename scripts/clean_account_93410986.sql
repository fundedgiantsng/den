-- Clean up Trading Account 93410986
UPDATE "TradingAccount"
SET "initialBalance" = 50000000.00,
    "currentBalance" = 50000000.00,
    "currentEquity" = 50000000.00,
    "totalProfit" = 0.00,
    status = 'ACTIVE'
WHERE "accountNumber" = '93410986';

-- Remove duplicate phantom auto-payout deposits from user wallet, retaining legitimate first payout & bank transfer
DELETE FROM "Deposit"
WHERE "walletId" IN (SELECT id FROM "CustomerWallet" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'fav.esedeke@gmail.com'))
  AND id NOT IN ('17de3fb1-35c5-44dc-b5fe-f489c300ce7e', '33291fee-28f2-42be-bc66-cae0bad835da');

-- Remove duplicate phantom auto-payout risk events
DELETE FROM "RiskEvent"
WHERE "tradingAccountId" IN (SELECT id FROM "TradingAccount" WHERE "accountNumber" = '93410986')
  AND "eventType" = 'AUTOMATED_PAYOUT_APPROVED'
  AND "createdAt" > '2026-11-23 11:00:00';
