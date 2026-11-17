import { PrismaClient, AccountType, FeeCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial FundedGiants ledger accounts and fee structure...');

  // 1. Double-Entry Chart of Accounts
  const ledgerAccounts = [
    {
      code: '1000-CASH-NOMBA',
      name: 'Nomba Settlement & Clearing Account',
      type: AccountType.ASSET,
      currency: 'NGN',
    },
    {
      code: '1000-CASH-LENCO',
      name: 'Legacy Settlement & Clearing Account',
      type: AccountType.ASSET,
      currency: 'NGN',
    },
    {
      code: '2000-WALLET-LIABILITY',
      name: 'User Wallet Balances (Liability)',
      type: AccountType.LIABILITY,
      currency: 'NGN',
    },
    {
      code: '4000-CHALLENGE-REVENUE',
      name: 'Challenge Assessment Revenue',
      type: AccountType.REVENUE,
      currency: 'NGN',
    },
    {
      code: '4100-FEE-REVENUE',
      name: 'Fee Income (Cards & Customisations)',
      type: AccountType.REVENUE,
      currency: 'NGN',
    },
    {
      code: '4200-NOTIFICATION-REVENUE',
      name: 'Notification Service Revenue (SMS, WhatsApp, Email)',
      type: AccountType.REVENUE,
      currency: 'NGN',
    },
    {
      code: '5000-PAYOUT-EXPENSE',
      name: 'Trader Payout Expenses',
      type: AccountType.EXPENSE,
      currency: 'NGN',
    },
  ];

  for (const acc of ledgerAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: acc,
    });
  }

  // 2. Central Fee Configurations
  const feeConfigs = [
    {
      category: FeeCategory.CARD_ISSUANCE_STANDARD,
      name: 'Standard Metal Card Issuance',
      fixedAmount: 100000, // ₦100,000 standard card
      percentage: 0,
      description: 'Standard laser-etched black stainless-steel debit card issuance fee',
      isActive: true,
    },
    {
      category: FeeCategory.CARD_CUSTOMIZATION_SURCHARGE,
      name: 'Custom Name Engraving Surcharge',
      fixedAmount: 50000, // +₦50,000 custom name
      percentage: 0,
      description: 'Custom name laser-engraving add-on fee for physical metal card',
      isActive: true,
    },
    {
      category: FeeCategory.WITHDRAWAL_FEE,
      name: 'Interbank Withdrawal Processing',
      fixedAmount: 100, // ₦100 flat Lenco transfer fee
      percentage: 0,
      description: 'Interbank disbursement processing fee',
      isActive: true,
    },
  ];

  for (const fee of feeConfigs) {
    await prisma.feeConfiguration.upsert({
      where: { category: fee.category },
      update: {
        name: fee.name,
        fixedAmount: fee.fixedAmount,
        percentage: fee.percentage,
        description: fee.description,
        isActive: fee.isActive,
      },
      create: fee,
    });
  }

  // 3. Challenge Products
  const challengeProducts = [
    { id: 'prod-rhino-rush-1000000', sku: 'rhino-rush-1000000', skuPrefix: 'rhino-rush', name: 'Rhino Rush ₦1M (1-Step)', type: 'RHINO_RUSH_ONE_STEP' as any, accountSize: 1000000, priceNgn: 27500, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 10.0, profitTargetPercent: 10.0, leverage: '1:100', profitSplit: 'Upto 80%' },
    { id: 'prod-rhino-rush-2500000', sku: 'rhino-rush-2500000', skuPrefix: 'rhino-rush', name: 'Rhino Rush ₦2.5M (1-Step)', type: 'RHINO_RUSH_ONE_STEP' as any, accountSize: 2500000, priceNgn: 67500, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 10.0, profitTargetPercent: 10.0, leverage: '1:100', profitSplit: 'Upto 80%' },
    { id: 'prod-rhino-rush-5000000', sku: 'rhino-rush-5000000', skuPrefix: 'rhino-rush', name: 'Rhino Rush ₦5M (1-Step)', type: 'RHINO_RUSH_ONE_STEP' as any, accountSize: 5000000, priceNgn: 127500, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 10.0, profitTargetPercent: 10.0, leverage: '1:100', profitSplit: 'Upto 80%' },
    { id: 'prod-rhino-rush-10000000', sku: 'rhino-rush-10000000', skuPrefix: 'rhino-rush', name: 'Rhino Rush ₦10M (1-Step)', type: 'RHINO_RUSH_ONE_STEP' as any, accountSize: 10000000, priceNgn: 247500, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 10.0, profitTargetPercent: 10.0, leverage: '1:100', profitSplit: 'Upto 80%' },
    { id: 'prod-rhino-rush-25000000', sku: 'rhino-rush-25000000', skuPrefix: 'rhino-rush', name: 'Rhino Rush ₦25M (1-Step)', type: 'RHINO_RUSH_ONE_STEP' as any, accountSize: 25000000, priceNgn: 487500, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 10.0, profitTargetPercent: 10.0, leverage: '1:100', profitSplit: 'Upto 80%' },
    { id: 'prod-rhino-rush-50000000', sku: 'rhino-rush-50000000', skuPrefix: 'rhino-rush', name: 'Rhino Rush ₦50M (1-Step)', type: 'RHINO_RUSH_ONE_STEP' as any, accountSize: 50000000, priceNgn: 967500, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 10.0, profitTargetPercent: 10.0, leverage: '1:100', profitSplit: 'Upto 80%' },

    { id: 'prod-phoenix-rise-1000000', sku: 'phoenix-rise-1000000', skuPrefix: 'phoenix-rise', name: 'Phoenix Rise ₦1M (Instant)', type: 'PHOENIX_RISE_INSTANT' as any, accountSize: 1000000, priceNgn: 43000, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 7.0, profitTargetPercent: 10.0, leverage: '1:30', profitSplit: 'Upto 80%' },
    { id: 'prod-phoenix-rise-2500000', sku: 'phoenix-rise-2500000', skuPrefix: 'phoenix-rise', name: 'Phoenix Rise ₦2.5M (Instant)', type: 'PHOENIX_RISE_INSTANT' as any, accountSize: 2500000, priceNgn: 106000, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 7.0, profitTargetPercent: 10.0, leverage: '1:30', profitSplit: 'Upto 80%' },
    { id: 'prod-phoenix-rise-5000000', sku: 'phoenix-rise-5000000', skuPrefix: 'phoenix-rise', name: 'Phoenix Rise ₦5M (Instant)', type: 'PHOENIX_RISE_INSTANT' as any, accountSize: 5000000, priceNgn: 209000, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 7.0, profitTargetPercent: 10.0, leverage: '1:30', profitSplit: 'Upto 80%' },
    { id: 'prod-phoenix-rise-10000000', sku: 'phoenix-rise-10000000', skuPrefix: 'phoenix-rise', name: 'Phoenix Rise ₦10M (Instant)', type: 'PHOENIX_RISE_INSTANT' as any, accountSize: 10000000, priceNgn: 412000, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 7.0, profitTargetPercent: 10.0, leverage: '1:30', profitSplit: 'Upto 80%' },
    { id: 'prod-phoenix-rise-25000000', sku: 'phoenix-rise-25000000', skuPrefix: 'phoenix-rise', name: 'Phoenix Rise ₦25M (Instant)', type: 'PHOENIX_RISE_INSTANT' as any, accountSize: 25000000, priceNgn: 1015000, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 7.0, profitTargetPercent: 10.0, leverage: '1:30', profitSplit: 'Upto 80%' },
    { id: 'prod-phoenix-rise-50000000', sku: 'phoenix-rise-50000000', skuPrefix: 'phoenix-rise', name: 'Phoenix Rise ₦50M (Instant)', type: 'PHOENIX_RISE_INSTANT' as any, accountSize: 50000000, priceNgn: 2018000, dailyDrawdownPercent: 4.0, maxDrawdownPercent: 7.0, profitTargetPercent: 10.0, leverage: '1:30', profitSplit: 'Upto 80%' },
  ];

  for (const prod of challengeProducts) {
    await prisma.challengeProduct.upsert({
      where: { id: prod.id },
      update: prod,
      create: prod,
    });
  }

  // 4. Verified Customer Account for Local Development & Real Ledger Testing
  const existingCustomer = await prisma.user.findFirst({
    where: { role: 'CUSTOMER' },
    include: { wallet: true },
  });

  if (!existingCustomer) {
    const demoUser = await prisma.user.create({
      data: {
        email: 'trader@fundedgiants.ng',
        phone: '+2348012345678',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        kycStatus: 'APPROVED',
        bankAccounts: {
          create: {
            bankName: 'Access Bank',
            bankCode: '044',
            accountNumber: '0091823741',
            accountName: 'JOHN DOE',
            isVerified: true,
          },
        },
      },
    });

    const wallet = await prisma.customerWallet.create({
      data: {
        userId: demoUser.id,
        currency: 'NGN',
        lencoVirtualBankName: 'Wema Bank',
        lencoAccountName: 'FG / JOHN DOE',
        lencoAccountNumber: '7041289410',
        lencoAccountReference: 'LENCO_REF_FG_7041289410',
      },
    });

    // Seed initial completed deposits into ledger
    await prisma.deposit.create({
      data: {
        walletId: wallet.id,
        reference: 'FG-INIT-DEP-001',
        amount: 12450000,
        currency: 'NGN',
        status: 'SUCCESSFUL',
        reconciled: true,
        senderName: 'JOHN DOE',
        senderBank: 'Access Bank',
        senderAccount: '0091823741',
      },
    });

    console.log('Seeded demo customer account with wallet balance and bank account.');
  }

  console.log('Database seeded successfully with chart of accounts and fee engine configuration.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
