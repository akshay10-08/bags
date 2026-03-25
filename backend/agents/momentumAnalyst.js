import { getTokenVolume, getActiveTraders } from '../services/heliusService.js';
import { runAgent } from '../agentRunner.js';
import { momentumPrompt } from '../prompts/momentumPrompt.js';
import { recordRun } from './agentHistory.js';

export async function runMomentumAnalyst(tokenAddress) {
  console.log("\n[MomentumAnalyst] Gathering data...");
  try {
    const volumeData    = await getTokenVolume(tokenAddress).catch(() => ({ volume24h: 0, volumeChange: 0, volumeUSD: 0 }));
    const activeTraders = await getActiveTraders(tokenAddress).catch(() => ({ activeTraders: 0, traderGrowth24h: 0 }));
    
    const tokenData = { tokenAddress, volumeData, activeTraders };
    const result = await runAgent("momentumAnalyst", momentumPrompt, tokenData);
    result.tokenAddress = tokenAddress;
    recordRun('momentumAnalyst', result, 'active');
    return result;
  } catch (err) {
    console.error('[MomentumAnalyst] Failed:', err.message);
    const fallback = { agentName: 'momentumAnalyst', tokenAddress, score: 0.5, confidence: 0.1, reasons: ['Data unavailable — defaulting to neutral'], flag: 'warn' };
    recordRun('momentumAnalyst', fallback, 'error');
    return fallback;
  }
}
