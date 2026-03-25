import { getTokenFees, getClaimEvents } from '../services/bagsService.js';
import { runAgent } from '../agentRunner.js';
import { feePrompt } from '../prompts/feePrompt.js';
import { recordRun } from './agentHistory.js';

export async function runFeeAnalyst(tokenAddress) {
  console.log("\n[FeeAnalyst] Gathering data...");
  try {
    const tokenFees   = await getTokenFees(tokenAddress).catch(() => ({ totalFeesEarned: 0, feeClaimedCount: 0, lastClaimAt: null, avgFeePerDay: 0 }));
    const claimEvents = await getClaimEvents(tokenAddress).catch(() => []);
    
    const tokenData = { tokenAddress, tokenFees, claimEvents };
    const result = await runAgent("feeAnalyst", feePrompt, tokenData);
    result.tokenAddress = tokenAddress;
    recordRun('feeAnalyst', result, 'active');
    return result;
  } catch (err) {
    console.error('[FeeAnalyst] Failed:', err.message);
    const fallback = { agentName: 'feeAnalyst', tokenAddress, score: 0.5, confidence: 0.1, reasons: ['Data unavailable — defaulting to neutral'], flag: 'warn' };
    recordRun('feeAnalyst', fallback, 'error');
    return fallback;
  }
}
