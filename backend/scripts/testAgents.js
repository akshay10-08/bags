/**
 * testAgents.js — Phase 2 test
 * Runs the 4 Claude agents and the Risk Manager on a single token.
 * Run: node scripts/testAgents.js
 */

import { checkLaunches } from '../agents/launchScout.js';
import { analyzeMomentum } from '../agents/momentumAnalyst.js';
import { checkCreator } from '../agents/creatorChecker.js';
import { analyzeFees } from '../agents/feeAnalyst.js';
import { manageRisk } from '../agents/riskManager.js';

// A recent token from the Bags feed
const TEST_TOKEN = '9wmiWkDKesyDVDnEwrWk65cCMMqHQkumS8AVE5gkBAGS';
const SEPARATOR = '\n' + '═'.repeat(60) + '\n';

async function runTest() {
  console.log(SEPARATOR);
  console.log('🤖 CONVICTION — Phase 2 Agent Tests');
  console.log(`📍 Test token: ${TEST_TOKEN}`);
  console.log(SEPARATOR);

  console.log('\\n[1/5] Running launchScout...');
  const scoutRes = await checkLaunches(TEST_TOKEN);

  console.log('\\n[2/5] Running momentumAnalyst...');
  const momentumRes = await analyzeMomentum(TEST_TOKEN);

  console.log('\\n[3/5] Running creatorChecker...');
  const creatorRes = await checkCreator(TEST_TOKEN);

  console.log('\\n[4/5] Running feeAnalyst...');
  const feeRes = await analyzeFees(TEST_TOKEN);

  console.log('\\n[5/5] Running riskManager...');
  const agentResults = [scoutRes, momentumRes, creatorRes, feeRes];
  const riskRes = manageRisk(agentResults);

  console.log(SEPARATOR);
  console.log('📊 Final Agent Outputs:');
  console.log('1. Launch Scout:', JSON.stringify(scoutRes, null, 2));
  console.log('2. Momentum Analyst:', JSON.stringify(momentumRes, null, 2));
  console.log('3. Creator Checker:', JSON.stringify(creatorRes, null, 2));
  console.log('4. Fee Analyst:', JSON.stringify(feeRes, null, 2));
  console.log('5. Risk Manager:', JSON.stringify(riskRes, null, 2));
  console.log(SEPARATOR);
}

runTest().catch(console.error);
