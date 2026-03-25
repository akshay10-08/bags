import { getNewTokenLaunches, getTokenCreator } from '../services/bagsService.js';
import { runAgent } from '../agentRunner.js';
import { launchScoutPrompt } from '../prompts/launchScoutPrompt.js';
import { recordRun } from './agentHistory.js';

export async function runLaunchScout(tokenAddress) {
  console.log("\n[LaunchScout] Gathering data...");
  try {
    const launches = await getNewTokenLaunches();
    const tokenFeedData = launches.find(t => t.address === tokenAddress) || { message: "Not found in recent launches feed" };
    const creatorProfile = await getTokenCreator(tokenAddress).catch(() => ({ creatorAddress: '', verifiedOnBags: false, pastTokenCount: 0, successfulTokens: 0, accountAge: 0 }));
    
    const tokenData = { tokenAddress, launchFeedData: tokenFeedData, creatorProfile };
    const result = await runAgent("launchScout", launchScoutPrompt, tokenData);
    result.tokenAddress = tokenAddress;
    recordRun('launchScout', result, 'active');
    return result;
  } catch (err) {
    console.error('[LaunchScout] Failed:', err.message);
    const fallback = { agentName: 'launchScout', tokenAddress, score: 0.5, confidence: 0.1, reasons: ['Data unavailable — defaulting to neutral'], flag: 'warn' };
    recordRun('launchScout', fallback, 'error');
    return fallback;
  }
}
