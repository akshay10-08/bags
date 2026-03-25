import { runLaunchScout } from './launchScout.js';
import { runMomentumAnalyst } from './momentumAnalyst.js';
import { runCreatorChecker } from './creatorChecker.js';
import { runFeeAnalyst } from './feeAnalyst.js';
import { runRiskManager } from './riskManager.js';
import { getNewTokenLaunches } from '../services/bagsService.js';
import { getPoolHealth } from '../services/meteoraService.js';

// ── IN-MEMORY STATS TRACKING ──
export const pipelineStats = {
  runTimes: [],       // last 10 pipeline durations in ms
  swapReadyCount: 0,  // tokens with conviction > 0.65
  totalEvaluated: 0,  // total tokens evaluated (non-blocked)
};

export async function runCoordinator(tokenAddress) {
  const pipelineStart = Date.now();
  try {
    const launches = await getNewTokenLaunches();
    const tokenInfo = launches.find(t => t.address === tokenAddress) || { symbol: 'UNKNOWN' };

    console.log(`\n[Coordinator] Running exactly 4 LLM agents in parallel...`);
    const [launchScout, momentumAnalyst, creatorChecker, feeAnalyst] = await Promise.all([
      runLaunchScout(tokenAddress),
      runMomentumAnalyst(tokenAddress),
      runCreatorChecker(tokenAddress),
      runFeeAnalyst(tokenAddress)
    ]);

    const agentReports = { launchScout, momentumAnalyst, creatorChecker, feeAnalyst };

    // 2. Risk Manager Rule-based blocking
    const riskManager = await runRiskManager(tokenAddress, agentReports);

    if (riskManager.flag === "block") {
      return {
        tokenAddress,
        tokenSymbol: tokenInfo.symbol,
        conviction: 0,
        verdict: "blocked",
        summary: `Blocked by risk manager: ${riskManager.warnings.join(', ')}`,
        swapReady: false,
        agentReports: [launchScout, momentumAnalyst, creatorChecker, feeAnalyst, riskManager],
        poolHealth: await getPoolHealth(tokenAddress).catch(()=>({ isHealthy: false })),
        timestamp: new Date().toISOString()
      };
    }

    // 3. Calculate weighted conviction score
    const weightedScore = 
      (launchScout.score * 0.20) +
      (momentumAnalyst.score * 0.30) +
      (creatorChecker.score * 0.25) +
      (feeAnalyst.score * 0.25);

    const avgConfidence = (launchScout.confidence + momentumAnalyst.confidence + creatorChecker.confidence + feeAnalyst.confidence) / 4;
    const conviction = Number((weightedScore * avgConfidence).toFixed(4));

    // 4. Map to verdict
    let verdict = "blocked";
    if (conviction > 0.75) verdict = "strong";
    else if (conviction > 0.55) verdict = "moderate";
    else if (conviction > 0.35) verdict = "weak";

    // 5. swapReady
    const swapReady = conviction > 0.65;

    let summary = `Token assessed with a ${verdict} verdict based on multi-agent consensus.`;
    if (verdict === "strong") summary = "High-momentum launch with strong creator reputation and healthy fee flow.";
    if (verdict === "moderate") summary = "Average momentum and creator history; shows potential but carries some risk.";
    if (verdict === "weak") summary = "Lacking significant traction or has unverified creator metrics.";

    // Track stats
    const elapsed = Date.now() - pipelineStart;
    pipelineStats.runTimes.push(elapsed);
    if (pipelineStats.runTimes.length > 10) pipelineStats.runTimes.shift();
    pipelineStats.totalEvaluated++;
    if (swapReady) pipelineStats.swapReadyCount++;

    console.log(`[Coordinator] Final Score: ${conviction}, Verdict: ${verdict}, Time: ${elapsed}ms`);

    return {
      tokenAddress,
      tokenSymbol: tokenInfo.symbol,
      conviction,
      verdict,
      summary,
      swapReady,
      agentReports: [launchScout, momentumAnalyst, creatorChecker, feeAnalyst, riskManager],
      poolHealth: await getPoolHealth(tokenAddress).catch(()=>({ isHealthy: false })),
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    console.error(`[Coordinator] Pipeline failed for \${tokenAddress}:`, err.message);
    throw err;
  }
}
