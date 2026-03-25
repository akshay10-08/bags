import { getNewTokenLaunches, getTokenCreator } from '../services/bagsService.js';
import { runAgent } from '../agentRunner.js';
import { launchScoutPrompt } from '../prompts/launchScoutPrompt.js';
import { recordRun } from './agentHistory.js';

export async function runLaunchScout(tokenAddress) {
  console.log("\n[LaunchScout] Gathering data...");
  const launches = await getNewTokenLaunches();
  const tokenFeedData = launches.find(t => t.address === tokenAddress) || { message: "Not found in recent launches feed" };
  const creatorProfile = await getTokenCreator(tokenAddress);
  
  const tokenData = { tokenAddress, launchFeedData: tokenFeedData, creatorProfile };
  const result = await runAgent("launchScout", launchScoutPrompt, tokenData);
  result.tokenAddress = tokenAddress;
  recordRun('launchScout', result, 'active');
  return result;
}
