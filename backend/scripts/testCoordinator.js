/**
 * testCoordinator.js — Phase 3 test
 * Runs the full pipeline on 3 real tokens from Bags.
 * Run: node scripts/testCoordinator.js
 */

import { getNewTokenLaunches } from '../services/bagsService.js';
import { checkLaunches } from '../agents/launchScout.js';
import { analyzeMomentum } from '../agents/momentumAnalyst.js';
import { checkCreator } from '../agents/creatorChecker.js';
import { analyzeFees } from '../agents/feeAnalyst.js';
import { manageRisk } from '../agents/riskManager.js';
import { coordinate } from '../agents/coordinator.js';

const SEPARATOR = '\n' + '═'.repeat(60) + '\n';

async function processToken(tokenObj) {
  const tokenAddress = tokenObj.tokenMint;
  const symbol = tokenObj.symbol;
  console.log(`\n\n🟢 PROCESSING TOKEN: ${symbol} (${tokenAddress})`);
  
  const scout = await checkLaunches(tokenAddress);
  const momentum = await analyzeMomentum(tokenAddress);
  const creator = await checkCreator(tokenAddress);
  const fee = await analyzeFees(tokenAddress);

  const risk = manageRisk([scout, momentum, creator, fee]);

  const output = coordinate(tokenAddress, { scout, momentum, creator, fee, risk });

  console.log(SEPARATOR);
  console.log(`🎯 COORDINATOR OUTPUT FOR ${symbol} (${tokenAddress}):`);
  console.log(JSON.stringify(output, null, 2));
  console.log(SEPARATOR);
}

async function runTest() {
  console.log(SEPARATOR);
  console.log('🤖 CONVICTION — Phase 3 Coordinator Tests');
  console.log('Fetching 3 real tokens from Bags feed...');
  console.log(SEPARATOR);

  try {
    const feedReq = await getNewTokenLaunches();
    let tokens = feedReq?.response || [];
    
    // Check if feed returns proper array, slice top 3
    if (!Array.isArray(tokens)) {
      console.error('Bags feed did not return an array. Using fallback tokens. Response:', tokens);
      // Fallback tokens just in case the API shape restricts us
      tokens = [
        { tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
        { tokenMint: '9wmiWkDKesyDVDnEwrWk65cCMMqHQkumS8AVE5gkBAGS', symbol: 'MTS' },
        { tokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' }
      ];
    }

    const testTokens = tokens.slice(0, 3);
    for (const token of testTokens) {
      if (!token.tokenMint) continue;
      await processToken(token);
    }
    
    console.log('\n✅ Phase 3 Testing Complete.');
  } catch (e) {
    console.error('Test failed:', e.message);
  }
}

runTest().catch(console.error);
