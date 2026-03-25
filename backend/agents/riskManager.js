import { getPoolHealth } from '../services/meteoraService.js';
import { recordRun } from './agentHistory.js';

export async function runRiskManager(tokenAddress, agentOutputs) {
  console.log("\n[RiskManager] Evaluating LLM outputs + liquidity health...");
  const { launchScout, momentumAnalyst, creatorChecker, feeAnalyst } = agentOutputs;
  const agents = [launchScout, momentumAnalyst, creatorChecker, feeAnalyst];
  
  let poolHealth = { isHealthy: false };
  try {
     poolHealth = await getPoolHealth(tokenAddress);
  } catch(e) {
     console.error("[RiskManager] Pool health fetch failed:", e.message);
  }

  let blockFlags = [];
  let warnFlags = [];
  let flag = "pass";

  // Rule 1
  for (const agent of agents) {
    if (agent && agent.score < 0.2) {
      blockFlags.push(agent.agentName);
    }
  }

  if (blockFlags.length > 0) flag = "block";
  if (creatorChecker && creatorChecker.flag === "block") flag = "block";

  // Rule 3
  const lowScores = agents.filter(a => a && a.score < 0.4).length;
  if (lowScores >= 3) {
     if (flag !== "block") flag = "warn";
     warnFlags.push("3 or more agents scored < 0.4");
  }

  // Rule 4
  if (poolHealth.isHealthy === false) {
     if (flag !== "block") flag = "warn";
     warnFlags.push("Liquidity pool is unhealthy (TVL < 10k or slippage > 5%)");
  }

  const result = {
    agentName: 'riskManager',
    tokenAddress,
    flag,
    score: flag === 'pass' ? 1 : flag === 'warn' ? 0.5 : 0,
    confidence: 1,
    reasons: [...blockFlags.map(b => `Blocked by ${b}`), ...warnFlags],
    blockedBy: blockFlags,
    warnings: warnFlags
  };
  recordRun('riskManager', result, 'active');
  return result;
}
