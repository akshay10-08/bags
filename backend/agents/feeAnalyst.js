import { getTokenFees, getClaimEvents } from '../services/bagsService.js';
import { runAgent } from '../agentRunner.js';
import { feePrompt } from '../prompts/feePrompt.js';
import { recordRun } from './agentHistory.js';

export async function runFeeAnalyst(tokenAddress) {
  console.log("\n[FeeAnalyst] Gathering data...");
  const tokenFees = await getTokenFees(tokenAddress);
  const claimEvents = await getClaimEvents(tokenAddress);
  
  const tokenData = { tokenAddress, tokenFees, claimEvents };
  const result = await runAgent("feeAnalyst", feePrompt, tokenData);
  result.tokenAddress = tokenAddress;
  recordRun('feeAnalyst', result, 'active');
  return result;
}
