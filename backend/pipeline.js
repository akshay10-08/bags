import { runLaunchScout } from './agents/launchScout.js';
import { runMomentumAnalyst } from './agents/momentumAnalyst.js';
import { runCreatorChecker } from './agents/creatorChecker.js';
import { runFeeAnalyst } from './agents/feeAnalyst.js';
import { runRiskManager } from './agents/riskManager.js';
import { runCoordinator } from './agents/coordinator.js';

export async function runTokenPipeline(tokenAddress) {
  try {
    const scout    = await runLaunchScout(tokenAddress);
    const momentum = await runMomentumAnalyst(tokenAddress);
    const creator  = await runCreatorChecker(tokenAddress);
    const fee      = await runFeeAnalyst(tokenAddress);

    const agentReports = { launchScout: scout, momentumAnalyst: momentum, creatorChecker: creator, feeAnalyst: fee };
    const risk = await runRiskManager(tokenAddress, agentReports);

    return await runCoordinator(tokenAddress);
  } catch (error) {
    console.error(`[Pipeline] Error for ${tokenAddress}:`, error.message);
    return {
      tokenAddress,
      conviction: 0,
      verdict: 'blocked',
      summary: 'Internal pipeline error',
      agentReports: [],
      swapReady: false,
    };
  }
}
