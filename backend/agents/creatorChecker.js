import { getTokenCreator } from '../services/bagsService.js';
import { getWalletHistory } from '../services/heliusService.js';
import { runAgent } from '../agentRunner.js';
import { creatorPrompt } from '../prompts/creatorPrompt.js';
import { recordRun } from './agentHistory.js';

export async function runCreatorChecker(tokenAddress) {
  console.log("\n[CreatorChecker] Gathering data...");
  try {
    const creatorProfile = await getTokenCreator(tokenAddress).catch(() => ({ creatorAddress: '', verifiedOnBags: false, pastTokenCount: 0, successfulTokens: 0, accountAge: 0 }));
    let walletHistory = [];
    if (creatorProfile?.creatorAddress) {
      walletHistory = await getWalletHistory(creatorProfile.creatorAddress).catch(() => []);
    }
    
    const tokenData = { tokenAddress, creatorProfile, walletHistory };
    const result = await runAgent("creatorChecker", creatorPrompt, tokenData);
    result.tokenAddress = tokenAddress;
    recordRun('creatorChecker', result, 'active');
    return result;
  } catch (err) {
    console.error('[CreatorChecker] Failed:', err.message);
    const fallback = { agentName: 'creatorChecker', tokenAddress, score: 0.5, confidence: 0.1, reasons: ['Data unavailable — defaulting to neutral'], flag: 'warn' };
    recordRun('creatorChecker', fallback, 'error');
    return fallback;
  }
}
