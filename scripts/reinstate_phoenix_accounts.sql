-- 1. Reinstate Trading Accounts
UPDATE "TradingAccount"
SET 
    status = 'ACTIVE',
    "currentBalance" = 50000000.00,
    "currentEquity" = 50000000.00,
    "totalProfit" = 0.00
WHERE "accountNumber" IN ('93410986', '96445139');

-- 2. Reinstate Customer Challenges
UPDATE "CustomerChallenge"
SET 
    status = 'ACTIVE',
    "failedAt" = NULL,
    "failureReason" = NULL
WHERE id IN (
    SELECT "challengeId" FROM "TradingAccount" WHERE "accountNumber" IN ('93410986', '96445139')
);

-- 3. Delete false DAILY_DD_BREACH risk events created today
DELETE FROM "RiskEvent"
WHERE "eventType" = 'DAILY_DD_BREACH'
  AND "createdAt" >= '2026-11-25 00:00:00'
  AND "tradingAccountId" IN (
    SELECT id FROM "TradingAccount" WHERE "accountNumber" IN ('93410986', '96445139')
);

-- 4. Insert clean baseline snapshot for today
INSERT INTO "RiskEvent" (id, "challengeId", "tradingAccountId", "eventType", severity, description, "snapshotBalance", "snapshotEquity", "createdAt")
SELECT 
    gen_random_uuid(),
    ta."challengeId",
    ta.id,
    'DAILY_RESET_SNAPSHOT',
    'INFO',
    'Session baseline established at ₦50,000,000 for reinstated Phoenix Rise account.',
    50000000.00,
    50000000.00,
    NOW()
FROM "TradingAccount" ta
WHERE ta."accountNumber" IN ('93410986', '96445139');
