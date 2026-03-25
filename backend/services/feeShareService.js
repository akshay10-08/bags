import 'dotenv/config';

// 5a. Configure Bags fee-share splits
const APP_TREASURY_WALLET = process.env.APP_TREASURY_WALLET || '8TZbEJXRjkkQGAAgCeiYFmSfwxsW3KkHdmT7J6FAMz3i'; // Fallback to an example wallet
const STRATEGY_CURATOR_WALLET = process.env.STRATEGY_CURATOR_WALLET || '8TZbEJXRjkkQGAAgCeiYFmSfwxsW3KkHdmT7J6FAMz3i';

/**
 * Builds the fee share configuration for a swap, defining exactly how 
 * protocol revenue is split onchain.
 * 
 * Splits:
 * - App treasury:    50%
 * - Strategy curator: 30%
 * - Referrer:        20% (if applicable, else redistributes)
 */
export function buildFeeShareConfig(referrerAddress) {
  console.log(`[FeeShareService] Building fee configuration`);
  
  const splits = [];

  // Treasury (50%)
  splits.push({
    wallet: APP_TREASURY_WALLET,
    percentage: 50
  });

  // Strategy curator / Agent creator (30%)
  splits.push({
    wallet: STRATEGY_CURATOR_WALLET,
    percentage: 30
  });

  // Referrer (20%)
  if (referrerAddress) {
    splits.push({
      wallet: referrerAddress,
      percentage: 20
    });
  } else {
    // If no referrer, the 20% drops down to the treasury
    splits[0].percentage += 20;
  }

  console.log(`[FeeShareService] Fee Splits:`, splits);
  return splits;
}

/**
 * Builds the claim transaction to withdraw accumulated fees from Bags 
 * for a specific wallet address.
 */
export async function claimFees(walletAddress) {
  console.log(`[FeeShareService] Initiating claimFees for ${walletAddress}`);
  // In a real application, this would call a POST /claim endpoint on the Bags API
  // or construct the Solana transaction using the Bags SDK or standard anchor methods.

  // Mocking the claim process for Phase 5 structure
  try {
    return {
      success: true,
      claimedFrom: walletAddress,
      status: 'Claim transaction built successfully',
      txHash: 'mock_tx_hash...'
    };
  } catch (error) {
    console.error(`[FeeShareService] Claim failed:`, error.message);
    throw error;
  }
}
