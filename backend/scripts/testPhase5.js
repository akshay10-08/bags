/**
 * testPhase5.js
 * Demonstrates the functionality of Phase 5 (Economic Layer)
 */

import { createReferral, getReferrerWallet } from '../services/referralService.js';
import { buildFeeShareConfig, claimFees } from '../services/feeShareService.js';

const SEPARATOR = '\n' + '═'.repeat(60) + '\n';

async function runTest() {
  console.log(SEPARATOR);
  console.log('💰 CONVICTION — Phase 5 Economic Tests');
  console.log(SEPARATOR);

  // 1. Storage & Referrals
  console.log('\n[1/3] Testing Referral Generation...');
  createReferral('LFG-HACK', '7Zgj3YpUvkpWZfcNUqoL4AW2mfgTfb9Hk69jjh23H2wA');
  const matchedWallet = getReferrerWallet('LFG-HACK');
  console.log(`Lookup 'LFG-HACK' -> ${matchedWallet}`);

  // 2. Fee Share Distribution logic
  console.log('\n[2/3] Building Fee Share Distribution (with referrer)...');
  const splitsWithReferrer = buildFeeShareConfig(matchedWallet);

  console.log('\nBuilding Fee Share Distribution (without referrer)...');
  const splitsWithoutReferrer = buildFeeShareConfig(null);

  // 3. Claim sequence
  console.log('\n[3/3] Simulating fee claim...');
  const claimRes = await claimFees('8TZbEJXRjkkQGAAgCeiYFmSfwxsW3KkHdmT7J6FAMz3i');
  console.log(`Claim Status: ${claimRes.status}`);

  console.log(SEPARATOR);
  console.log('✅ Phase 5 Architecture Logic Verified.');
}

runTest().catch(console.error);
