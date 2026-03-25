import { getTokenCreator } from '../services/bagsService.js';
import { getWalletHistory } from '../services/heliusService.js';
import { runAgent } from '../agentRunner.js';
import { creatorPrompt } from '../prompts/creatorPrompt.js';
import { recordRun } from './agentHistory.js';

export async function runCreatorChecker(tokenAddress) {
  console.log("\n[CreatorChecker] Gathering data...");
  const creatorProfile = await getTokenCreator(tokenAddress);
  let walletHistory = [];
  if (creatorProfile && creatorProfile.creatorAddress && creatorProfile.creatorAddress !== '') {
    walletHistory = await getWalletHistory(creatorProfile.creatorAddress);
  }
  
  const tokenData = { tokenAddress, creatorProfile, walletHistory };
  const result = await runAgent("creatorChecker", creatorPrompt, tokenData);
  result.tokenAddress = tokenAddress;
  recordRun('creatorChecker', result, 'active');
  return result;
}
