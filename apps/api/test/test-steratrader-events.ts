import { prisma } from '@fundedgiants/database';

async function testSteraTraderFlow() {
  console.log('--- 1. Ensuring Test User & Challenge for SteraTrader Testing ---');
  let user = await prisma.user.findFirst({ where: { email: 'trader@fundedgiants.ng' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'trader@fundedgiants.ng',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        kycStatus: 'APPROVED',
      },
    });
  }

  const product = await prisma.challengeProduct.findFirst({
    where: { sku: 'rhino-rush-10000000' },
  });

  const order = await prisma.internalOrder.upsert({
    where: { orderNumber: 'FG-ORD-TEST-STERA' },
    update: {},
    create: {
      orderNumber: 'FG-ORD-TEST-STERA',
      userId: user.id,
      amount: 247500,
      currency: 'NGN',
      paymentMethod: 'WALLET',
      paymentStatus: 'SUCCESSFUL',
    },
  });

  let challenge = await prisma.customerChallenge.findFirst({
    where: { orderId: order.id },
  });

  if (!challenge) {
    challenge = await prisma.customerChallenge.create({
      data: {
        challengeNumber: 'FG-CH-TEST-STERA',
        userId: user.id,
        orderId: order.id,
        productId: product!.id,
        type: 'RHINO_RUSH_ONE_STEP',
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
  }

  const account = await prisma.tradingAccount.upsert({
    where: { accountNumber: 'ST-1092841' },
    update: {
      status: 'ACTIVE',
      currentBalance: 10000000,
      currentEquity: 10000000,
      initialBalance: 10000000,
    },
    create: {
      accountNumber: 'ST-1092841',
      userId: user.id,
      challengeId: challenge.id,
      platform: 'SteraTrader',
      status: 'ACTIVE',
      initialBalance: 10000000,
      currentBalance: 10000000,
      currentEquity: 10000000,
      dailyDrawdownLimit: 400000,
      maxDrawdownLimit: 1000000,
    },
  });

  console.log(`Trading account ${account.accountNumber} ready (Balance: ₦10M, Daily Limit: ₦400k, Max Limit: ₦1M)`);

  console.log('\n--- 2. Sending Real-Time TRADE_OPEN Event ---');
  const tradeOpenRes = await fetch('http://localhost:4000/api/v1/webhooks/steratrader/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'TRADE_OPEN',
      accountNumber: 'ST-1092841',
      tradeId: 'T-98001',
      symbol: 'XAUUSD',
      direction: 'BUY',
      volume: 1.5,
      openPrice: 2650.50,
      profit: 50000,
      balance: 10000000,
      equity: 10050000,
      timestamp: new Date().toISOString(),
    }),
  });

  console.log(`TRADE_OPEN response status: ${tradeOpenRes.status}`);
  const tradeOpenData = await tradeOpenRes.json();
  console.log('TRADE_OPEN evaluation result:', tradeOpenData);

  console.log('\n--- 3. Verifying Risk Status & 2% Daily Profit Cap via Risk Engine ---');
  const statusRes = await fetch('http://localhost:4000/api/v1/risk/status/ST-1092841');
  const statusData = await statusRes.json();
  console.log({
    accountNumber: statusData.accountNumber,
    currentEquity: statusData.currentEquityNgn,
    dailyDrawdown: statusData.dailyDrawdown?.model,
    dailyHeadroom: statusData.dailyDrawdown?.headroomRemainingNgn,
    targetEvaluation: statusData.targetEvaluation,
  });

  console.log('\n--- 4. Sending Simulated 4% Daily Drawdown Breach Event ---');
  // Daily baseline is 10,000,000. 4% daily limit is 400,000. An equity drop to 9,550,000 represents a 450,000 drop (breach!)
  const breachRes = await fetch('http://localhost:4000/api/v1/webhooks/steratrader/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'TRADE_UPDATE',
      accountNumber: 'ST-1092841',
      tradeId: 'T-98001',
      symbol: 'XAUUSD',
      direction: 'BUY',
      volume: 1.5,
      profit: -450000,
      balance: 10000000,
      equity: 9550000,
      timestamp: new Date().toISOString(),
    }),
  });

  console.log(`Breach Event response status: ${breachRes.status}`);
  const breachData = await breachRes.json();
  console.log('Breach enforcement result:', breachData);

  // Check account status in DB
  const breachedAccount = await prisma.tradingAccount.findUnique({
    where: { accountNumber: 'ST-1092841' },
    include: {
      riskEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
      challenge: true,
    },
  });

  console.log('\n--- 5. Database State After Breach Enforcement ---');
  console.log({
    accountNumber: breachedAccount?.accountNumber,
    accountStatus: breachedAccount?.status, // Expect CLOSED
    challengeStatus: breachedAccount?.challenge?.status, // Expect FAILED
    failureReason: breachedAccount?.challenge?.failureReason,
    latestRiskEvent: breachedAccount?.riskEvents?.[0]?.eventType,
  });

  await prisma.$disconnect();
}

testSteraTraderFlow().catch(console.error);
