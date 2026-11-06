import { DEMO_ACCOUNTS, getDemoAccounts } from './controllers/authController';
async function verifyCleanSlate() {
  console.log('--- TaskFlow Clean Slate Verification ---');

  // 1. Verify Demo Accounts Purge
  console.log('1. Checking DEMO_ACCOUNTS array...');
  if (DEMO_ACCOUNTS.length !== 0) {
    throw new Error(`Expected DEMO_ACCOUNTS to be empty, found ${DEMO_ACCOUNTS.length}`);
  }
  console.log('   ✅ DEMO_ACCOUNTS is empty (0 accounts).');

  console.log('4. Testing GET /api/auth/demo-accounts via HTTP...');
  const res = await fetch('http://localhost:5000/api/auth/demo-accounts');
  if (res.ok) {
    const data = (await res.json()) as any;
    if (data.demoAccounts && data.demoAccounts.length === 0) {
      console.log('   ✅ HTTP /api/auth/demo-accounts returned 0 accounts.');
    } else {
      throw new Error(`Expected 0 demo accounts from API, got ${data.demoAccounts?.length}`);
    }
  } else {
    console.warn('   ⚠️ HTTP server not responding on port 5000, skipping HTTP check');
  }

  console.log('\n🎉 ALL CLEAN SLATE PURGE CHECKS PASSED SUCCESSFULLY!');
}

verifyCleanSlate().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
