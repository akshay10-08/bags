/**
 * meteoraService.js
 * Meteora DLMM pool liquidity data
 * Uses Meteora's public API + optional Helius RPC for on-chain pool accounts
 * API: https://dlmm-api.meteora.ag
 */

import 'dotenv/config';

const METEORA_BASE_URL = 'https://dlmm-api.meteora.ag';

/**
 * Internal fetch wrapper
 */
async function meteoraFetch(path) {
  const url = `${METEORA_BASE_URL}${path}`;
  console.log(`\n[MeteoraService] → GET ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Meteora API HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    console.log(`[MeteoraService] ← Response success from ${path}`);
    return data;
  } catch (err) {
    console.error(`[MeteoraService] ERROR calling ${path}:`, err.message);
    throw err;
  }
}

/**
 * getPoolLiquidity(tokenAddress)
 * → Fetches liquidity pool data for this token
 * → Returns: { totalLiquidity, poolAddress, apr, tvl }
 */
export async function getPoolLiquidity(tokenAddress) {
  try {
    const data = await meteoraFetch(`/pair/all_by_groups?token=${tokenAddress}`);
    
    // Find the largest pool
    let bestPool = null;
    let maxLiquidity = 0;

    if (Array.isArray(data?.groups)) {
      for (const group of data.groups) {
        if (Array.isArray(group.pairs)) {
          for (const pair of group.pairs) {
            const liq = Number(pair.liquidity) || 0;
            if (liq > maxLiquidity) {
              maxLiquidity = liq;
              bestPool = pair;
            }
          }
        }
      }
    } else if (data && typeof data === 'object' && Array.isArray(data.pairs)) {
       // fallback structure if api route changes
       for (const pair of data.pairs) {
          const liq = Number(pair.liquidity) || 0;
          if (liq > maxLiquidity) {
            maxLiquidity = liq;
            bestPool = pair;
          }
       }
    }

    if (!bestPool) {
      return { totalLiquidity: 0, poolAddress: '', apr: 0, tvl: 0 };
    }

    const totalLiquidity = Number(bestPool.liquidity) || 0;
    // Meteora DLMM APIs often just supply liquidity as USD TVL representation
    const tvl = typeof bestPool.tvl !== 'undefined' ? Number(bestPool.tvl) : totalLiquidity; 

    return {
      totalLiquidity,
      poolAddress: bestPool.address || '',
      apr: Number(bestPool.apr) || 0,
      tvl
    };

  } catch (err) {
    console.error(`[MeteoraService] getPoolLiquidity failed:`, err.message);
    throw err;
  }
}

/**
 * getPoolHealth(tokenAddress)
 * → Returns: { isHealthy, liquidityDepth, slippageAt1k }
 * → isHealthy = true if tvl > $10,000 and slippage < 5%
 */
export async function getPoolHealth(tokenAddress) {
  try {
    const pool = await getPoolLiquidity(tokenAddress);
    const tvl = pool.tvl;
    
    // Heuristic calculation if exact slippage isn't exported by API
    // Constant product x*y=k heuristic approximation for $1000 trade:
    // slippage % = (trade_size) / (tvl / 2) * 100
    // since we trade against half the pool reserves.
    // -> slippage = 1000 / (tvl/2) * 100 = 200000 / tvl
    let slippageAt1k = 0;
    if (tvl > 0) {
      slippageAt1k = Math.min(200000 / tvl, 100); 
    } else {
      slippageAt1k = 100; // 100% slippage if 0 liquidity
    }
    
    // Round to 2 decimal places
    slippageAt1k = Math.round(slippageAt1k * 100) / 100;

    const isHealthy = (tvl > 10000) && (slippageAt1k < 5.0);

    return {
      isHealthy,
      liquidityDepth: tvl,
      slippageAt1k
    };

  } catch (err) {
    console.error(`[MeteoraService] getPoolHealth failed:`, err.message);
    throw err;
  }
}
