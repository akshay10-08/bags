/**
 * testServices.js  — Phase 1d test
 * Hits all three services with a single hardcoded Solana token address
 * Run: node scripts/testServices.js
 *
 * Token used for testing:
 *   USDC mint on Solana mainnet — EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 *   (Widely-indexed; guaranteed to return data from Helius + Meteora)
 */

import { getNewTokenLaunches, getTokenCreator, getTokenFees, getClaimEvents, getTradeQuote } from '../services/bagsService.js';
import { getTokenVolume, getActiveTraders, getWalletHistory } from '../services/heliusService.js';
import { getPoolLiquidity } from '../services/meteoraService.js';

const TEST_TOKEN = '8NVZDP32HvJbb5aYBruQUpJKnGj2W6v7oV4YEEEiBAGS';
// Well-known wallet for testing (Solana Labs wallet)
const TEST_WALLET = 'B9Lf9z5BfNPT4d5KMeaBFx8x1G4CULZYR1jbGZc7eMxe';

const SEPARATOR = '\n' + '═'.repeat(60) + '\n';

async function runTests() {
  console.log(SEPARATOR);
  console.log('🔍 CONVICTION — Phase 1d Service Tests');
  console.log(`📍 Test token: ${TEST_TOKEN}`);
  console.log(SEPARATOR);

  const results = {};

  // ── BAGS SERVICE ──────────────────────────────────────────────
  console.log('\n📦 [1] getNewTokenLaunches()');
  try {
    results.launches = await getNewTokenLaunches(5);
    console.log('✅ getNewTokenLaunches OK →', JSON.stringify(results.launches, null, 2).slice(0, 300));
  } catch (e) {
    console.error('❌ getNewTokenLaunches FAILED:', e.message);
    results.launches = { error: e.message };
  }

  console.log('\n📦 [2] getTokenCreator()');
  try {
    results.creator = await getTokenCreator(TEST_TOKEN);
    console.log('✅ getTokenCreator OK →', JSON.stringify(results.creator, null, 2).slice(0, 300));
  } catch (e) {
    console.error('❌ getTokenCreator FAILED:', e.message);
    results.creator = { error: e.message };
  }

  console.log('\n📦 [3] getTokenFees()');
  try {
    results.fees = await getTokenFees(TEST_TOKEN);
    console.log('✅ getTokenFees OK →', JSON.stringify(results.fees, null, 2).slice(0, 300));
  } catch (e) {
    console.error('❌ getTokenFees FAILED:', e.message);
    results.fees = { error: e.message };
  }

  console.log('\n📦 [4] getClaimEvents()');
  try {
    results.claims = await getClaimEvents(TEST_TOKEN);
    console.log('✅ getClaimEvents OK →', JSON.stringify(results.claims, null, 2).slice(0, 300));
  } catch (e) {
    console.error('❌ getClaimEvents FAILED:', e.message);
    results.claims = { error: e.message };
  }

  // ── HELIUS SERVICE ────────────────────────────────────────────
  console.log('\n⛓️  [5] getTokenVolume()');
  try {
    results.volume = await getTokenVolume(TEST_TOKEN);
    console.log('✅ getTokenVolume OK →', JSON.stringify(results.volume, null, 2));
  } catch (e) {
    console.error('❌ getTokenVolume FAILED:', e.message);
    results.volume = { error: e.message };
  }

  console.log('\n⛓️  [6] getActiveTraders()');
  try {
    results.traders = await getActiveTraders(TEST_TOKEN);
    console.log('✅ getActiveTraders OK →', JSON.stringify(results.traders, null, 2));
  } catch (e) {
    console.error('❌ getActiveTraders FAILED:', e.message);
    results.traders = { error: e.message };
  }

  console.log('\n⛓️  [7] getWalletHistory()');
  try {
    results.wallet = await getWalletHistory(TEST_WALLET, 5);
    console.log('✅ getWalletHistory OK →', `${results.wallet.totalFetched} txs fetched`);
    console.log(JSON.stringify(results.wallet.transactions.slice(0, 2), null, 2));
  } catch (e) {
    console.error('❌ getWalletHistory FAILED:', e.message);
    results.wallet = { error: e.message };
  }

  // ── METEORA SERVICE ───────────────────────────────────────────
  console.log('\n💧 [8] getPoolLiquidity()');
  try {
    results.liquidity = await getPoolLiquidity(TEST_TOKEN);
    console.log('✅ getPoolLiquidity OK →', JSON.stringify({
      totalPools: results.liquidity.totalPools,
      totalLiquidity: results.liquidity.totalLiquidity,
      totalVolume24h: results.liquidity.totalVolume24h,
    }, null, 2));
  } catch (e) {
    console.error('❌ getPoolLiquidity FAILED:', e.message);
    results.liquidity = { error: e.message };
  }

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log(SEPARATOR);
  console.log('📊 Phase 1d Test Summary:');
  const passed = Object.values(results).filter((r) => !r?.error).length;
  const total = Object.keys(results).length;
  console.log(`   ✅ ${passed}/${total} endpoints responded`);
  const failed = Object.entries(results).filter(([, r]) => r?.error);
  if (failed.length > 0) {
    console.log('\n   ❌ Failed endpoints:');
    failed.forEach(([name, r]) => console.log(`     - ${name}: ${r.error}`));
  }
  console.log('\n   ℹ️  Bags service errors = expected until BAGS_API_KEY is set');
  console.log('   ℹ️  Helius volume/traders may fail for non-top-10k tokens');
  console.log(SEPARATOR);
}

runTests().catch(console.error);
