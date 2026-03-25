import { getTokenVolume, getActiveTraders } from '../services/heliusService.js';
import { runAgent } from '../agentRunner.js';
import { momentumPrompt } from '../prompts/momentumPrompt.js';
import { recordRun } from './agentHistory.js';

export async function runMomentumAnalyst(tokenAddress) {
  console.log("\n[MomentumAnalyst] Gathering data...");
  const volumeData = await getTokenVolume(tokenAddress);
  const activeTraders = await getActiveTraders(tokenAddress);
  
  const tokenData = { tokenAddress, volumeData, activeTraders };
  const result = await runAgent("momentumAnalyst", momentumPrompt, tokenData);
  result.tokenAddress = tokenAddress;
  recordRun('momentumAnalyst', result, 'active');
  return result;
}
