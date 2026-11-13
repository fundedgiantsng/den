import { PrismaClient, AccountType, FeeCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial FundedGiants ledger accounts and fee structure...');

  // 1. Double-Entry Chart of Accounts
  const ledgerAccounts = [
    {
      code: '1000-CASH-LENCO',
      name: 'Lenco Settlement & Clearing Account',
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
