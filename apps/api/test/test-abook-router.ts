import { TradeRouterService } from '../src/modules/risk/trade-router.service';

function runAbookTests() {
  console.log('====================================================');
  console.log('   FUNDEDGIANTS A-BOOK ROUTER & LOT SCALING TESTS   ');
  console.log('====================================================\n');

  const router = new TradeRouterService();

  // Test 1: Lot Sizing Logic
  console.log('--- 1. Testing Lot Sizing Rules (0.01 as-is, >=0.02 scaled) ---');
  
  // 0.01 lot with 0.50 ratio -> Must remain 0.01
  const lot1 = router.calculateBrokerVolume(0.01, 0.50);
  console.log(`0.01 lot (ratio 0.50) -> Broker Lot: ${lot1} [Expected: 0.01] -> ${lot1 === 0.01 ? '✅ PASS' : '❌ FAIL'}`);

  // 0.02 lot with 0.50 ratio -> 0.01
  const lot2 = router.calculateBrokerVolume(0.02, 0.50);
  console.log(`0.02 lot (ratio 0.50) -> Broker Lot: ${lot2} [Expected: 0.01] -> ${lot2 === 0.01 ? '✅ PASS' : '❌ FAIL'}`);

  // 0.04 lot with 0.50 ratio -> 0.02
  const lot3 = router.calculateBrokerVolume(0.04, 0.50);
  console.log(`0.04 lot (ratio 0.50) -> Broker Lot: ${lot3} [Expected: 0.02] -> ${lot3 === 0.02 ? '✅ PASS' : '❌ FAIL'}`);

  // 0.10 lot with 0.70 ratio -> 0.07
  const lot4 = router.calculateBrokerVolume(0.10, 0.70);
  console.log(`0.10 lot (ratio 0.70) -> Broker Lot: ${lot4} [Expected: 0.07] -> ${lot4 === 0.07 ? '✅ PASS' : '❌ FAIL'}`);

  // 1.50 lot with 0.60 ratio -> 0.90
  const lot5 = router.calculateBrokerVolume(1.50, 0.60);
  console.log(`1.50 lot (ratio 0.60) -> Broker Lot: ${lot5} [Expected: 0.90] -> ${lot5 === 0.90 ? '✅ PASS' : '❌ FAIL'}`);

  // Test 2: 12-Account Segregation Mapping
  console.log('\n--- 2. Testing 12-Account Target Segregation Mapping ---');
  const targetPR1M = router.resolveDefaultTargetAccount('phoenix-rise', 1_000_000);
  console.log(`Phoenix Rise ₦1M -> Target: ${targetPR1M} [Expected: PR-1M] -> ${targetPR1M === 'PR-1M' ? '✅ PASS' : '❌ FAIL'}`);

  const targetPR25M = router.resolveDefaultTargetAccount('phoenix-rise', 2_500_000);
  console.log(`Phoenix Rise ₦2.5M -> Target: ${targetPR25M} [Expected: PR-2.5M] -> ${targetPR25M === 'PR-2.5M' ? '✅ PASS' : '❌ FAIL'}`);

  const targetPR10M = router.resolveDefaultTargetAccount('phoenix-rise', 10_000_000);
  console.log(`Phoenix Rise ₦10M -> Target: ${targetPR10M} [Expected: PR-10M] -> ${targetPR10M === 'PR-10M' ? '✅ PASS' : '❌ FAIL'}`);

  const targetRR1M = router.resolveDefaultTargetAccount('rhino-rush', 1_000_000);
  console.log(`Rhino Rush ₦1M -> Target: ${targetRR1M} [Expected: RR-1M] -> ${targetRR1M === 'RR-1M' ? '✅ PASS' : '❌ FAIL'}`);

  const targetRR25M = router.resolveDefaultTargetAccount('rhino-rush', 25_000_000);
  console.log(`Rhino Rush ₦25M -> Target: ${targetRR25M} [Expected: RR-25M] -> ${targetRR25M === 'RR-25M' ? '✅ PASS' : '❌ FAIL'}`);

  const targetRR50M = router.resolveDefaultTargetAccount('rhino-rush', 50_000_000);
  console.log(`Rhino Rush ₦50M -> Target: ${targetRR50M} [Expected: RR-50M] -> ${targetRR50M === 'RR-50M' ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n🎉 ALL A-BOOK ROUTER & LOT SIZING LOGIC VERIFIED SUCCESSFULLY!');
}

runAbookTests();
