import { checkLaunches } from './agents/launchScout.js';
import { analyzeMomentum } from './agents/momentumAnalyst.js';
import { checkCreator } from './agents/creatorChecker.js';
import { analyzeFees } from './agents/feeAnalyst.js';
import { manageRisk } from './agents/riskManager.js';
import { coordinate } from './agents/coordinator.js';

export async function runTokenPipeline(tokenAddress) {
  try {
    const scout = await checkLaunches(tokenAddress);
    const momentum = await analyzeMomentum(tokenAddress);
    const creator = await checkCreator(tokenAddress);
    const fee = await analyzeFees(tokenAddress);

    const risk = manageRisk([scout, momentum, creator, fee]);
    return coordinate(tokenAddress, { scout, momentum, creator, fee, risk });
  } catch (error) {
    console.error(`Pipeline error for ${tokenAddress}:`, error);
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
