/**
 * bagsService.js
 * Official Bags.fm API integration for CONVICTION
 * Base URL: https://public-api-v2.bags.fm/api/v1
 */

import 'dotenv/config';

const BAGS_BASE_URL = 'https://public-api-v2.bags.fm/api/v1';

const getHeaders = () => {
  if (!process.env.BAGS_API_KEY) {
    console.warn('[BagsService] Warning: BAGS_API_KEY is not set in environment variables');
  }
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.BAGS_API_KEY || '',
  };
};

/**
 * Internal fetch wrapper with logging + error handling
 */
async function bagsFetch(path, options = {}) {
  const url = `${BAGS_BASE_URL}${path}`;
  console.log(`\n[BagsService] → ${options.method || 'GET'} ${url}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`BagsAPI HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    console.log(`[BagsService] ← Response success from ${path}`);
    return data;
  } catch (err) {
    console.error(`[BagsService] ERROR calling ${path}:`, err.message);
    throw err;
  }
}

/**
 * getNewTokenLaunches()
 * → Fetches latest token launches from Bags feed
 * → Returns array of: { address, symbol, name, createdAt, creatorAddress, marketCap, volume24h, activeTraders }
 */
export async function getNewTokenLaunches() {
  try {
    const data = await bagsFetch(`/token-launch/feed`);
    
    // Validate response shape
    if (!data.success || !Array.isArray(data.response)) {
      throw new Error("Invalid response format from /token-launch/feed");
    }

    // Map to required clean structured data
    return data.response.map(raw => ({
      address: raw.tokenMint || raw.address || '',
      symbol: raw.symbol || 'UNKNOWN',
      name: raw.name || 'Unknown Token',
      createdAt: raw.createdAt || new Date().toISOString(),
      creatorAddress: raw.creator || raw.creatorAddress || '',
      marketCap: Number(raw.marketCap) || 0,
      volume24h: Number(raw.volume24h || raw.usdVolume) || 0,
      activeTraders: Number(raw.activeTraders || raw.traderCount) || 0
    }));

  } catch (err) {
    console.error(`[BagsService] getNewTokenLaunches failed:`, err.message);
    throw err;
  }
}

/**
 * getTokenCreator(tokenAddress)
 * → Fetches creator profile for a token
 * → Returns: { creatorAddress, verifiedOnBags, pastTokenCount, successfulTokens, accountAge }
 */
export async function getTokenCreator(tokenAddress) {
  try {
    const data = await bagsFetch(`/token-launch/creator/v3?tokenMint=${tokenAddress}`);
    
    if (!data.success || !Array.isArray(data.response) || data.response.length === 0) {
      // Default empty state if creator not found gracefully
      return {
        creatorAddress: '',
        verifiedOnBags: false,
        pastTokenCount: 0,
        successfulTokens: 0,
        accountAge: 0
      };
    }

    const raw = data.response[0];
    return {
      creatorAddress: raw.wallet || '',
      verifiedOnBags: !!raw.providerUsername || raw.isAdmin || false,
      pastTokenCount: Number(raw.pastTokenCount) || 0,
      successfulTokens: Number(raw.successfulTokens) || 0,
      accountAge: Number(raw.accountAge) || 0
    };
  } catch (err) {
    console.error(`[BagsService] getTokenCreator failed:`, err.message);
    throw err;
  }
}

/**
 * getTokenFees(tokenAddress)
 * → Fetches lifetime fee data for a token
 * → Returns: { totalFeesEarned, feeClaimedCount, lastClaimAt, avgFeePerDay }
 */
export async function getTokenFees(tokenAddress) {
  try {
    const data = await bagsFetch(`/fee-share/token/lifetime-fees?tokenMint=${tokenAddress}`);
    
    if (!data.success) {
      throw new Error("Failed to fetch token fees.");
    }
    
    const raw = data.response || {};
    return {
      totalFeesEarned: Number(raw.totalFeesEarned) || 0,
      feeClaimedCount: Number(raw.feeClaimedCount) || 0,
      lastClaimAt: raw.lastClaimAt || null,
      avgFeePerDay: Number(raw.avgFeePerDay) || 0
    };
  } catch (err) {
    console.error(`[BagsService] getTokenFees failed:`, err.message);
    // As per CONVICTION_DOCS, return structured failure or fallback default
    return { totalFeesEarned: 0, feeClaimedCount: 0, lastClaimAt: null, avgFeePerDay: 0 };
  }
}

/**
 * getClaimEvents(tokenAddress)
 * → Fetches recent claim transactions for a token
 * → Returns array of: { claimedAt, amount, claimerAddress }
 */
export async function getClaimEvents(tokenAddress) {
  try {
    const data = await bagsFetch(`/fee-share/token/claim-events?tokenMint=${tokenAddress}`);
    
    if (!data.success || !data.response || !Array.isArray(data.response.events)) {
      return [];
    }

    return data.response.events.map(raw => ({
      claimedAt: raw.timestamp || Date.now(),
      amount: Number(raw.amount) || 0,
      claimerAddress: raw.wallet || ''
    }));
  } catch (err) {
    console.error(`[BagsService] getClaimEvents failed:`, err.message);
    throw err;
  }
}

/**
 * getTradeQuote(tokenInAddress, tokenOutAddress, amountIn)
 * → Fetches a live swap quote from Bags
 * → Returns: { estimatedOut, priceImpact, route, expiresAt }
 */
export async function getTradeQuote(tokenInAddress, tokenOutAddress, amountIn) {
  try {
    const params = new URLSearchParams({
      inputMint: tokenInAddress,
      outputMint: tokenOutAddress,
      amount: String(amountIn),
      slippageMode: 'auto'
    });
    
    const data = await bagsFetch(`/trade/quote?${params}`);
    const raw = data.response || {};
    
    return {
      estimatedOut: Number(raw.estimatedOut || raw.outAmount) || 0,
      priceImpact: Number(raw.priceImpact || raw.priceImpactPct) || 0,
      route: raw.route || raw.routePlan || [],
      expiresAt: raw.expiresAt || Date.now() + 60000 // default expiry 1 min
    };
  } catch (err) {
    console.error(`[BagsService] getTradeQuote failed:`, err.message);
    throw err;
  }
}

/**
 * buildSwapTransaction(tokenAddress, amount, walletAddress, referrerAddress)
 * → Builds a swap transaction via Bags API
 * → Returns the raw transaction object ready to be signed
 */
export async function buildSwapTransaction(tokenAddress, amount, walletAddress, referrerAddress) {
  try {
    // We assume SOL is the input token for standard conviction swaps, or vice-versa
    // Getting a quote first as it's typically required to build a swap tx
    const quoteData = await bagsFetch(`/trade/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenAddress}&amount=${amount}`);
    
    if (!quoteData.success || !quoteData.response) {
      throw new Error("Failed to retrieve quote required to build swap transaction");
    }

    const data = await bagsFetch('/trade/swap', {
      method: 'POST',
      body: JSON.stringify({ 
        quoteResponse: quoteData.response, 
        userPublicKey: walletAddress,
        referrer: referrerAddress 
      }),
    });

    // Returns raw transaction base64 or object
    return data.swapTransaction || data.response || data;
  } catch (err) {
    console.error(`[BagsService] buildSwapTransaction failed:`, err.message);
    throw err;
  }
}

/**
 * sendTransaction(signedTransaction)
 * → Broadcasts signed transaction to Solana via Bags
 * → Returns: { txHash, status, confirmedAt }
 */
export async function sendTransaction(signedTransaction) {
  try {
    const data = await bagsFetch('/trade/send', {
      method: 'POST',
      body: JSON.stringify({ signedTransaction }),
    });
    
    const raw = data.response || data;
    return {
      txHash: raw.txHash || raw.signature || '',
      status: raw.status || 'success',
      confirmedAt: raw.confirmedAt || Date.now()
    };
  } catch (err) {
    console.error(`[BagsService] sendTransaction failed:`, err.message);
    throw err;
  }
}

/**
 * buildFeeShareConfig(appTreasuryWallet, curatorWallet, referrerWallet)
 * → Configures fee splits: 50% app, 30% curator, 20% referrer
 * → Returns the fee-share config object
 */
export async function buildFeeShareConfig(appTreasuryWallet, curatorWallet, referrerWallet) {
  try {
    console.log(`\n[BagsService] buildFeeShareConfig called`);
    // This doesn't necessarily need an API call if it's just building a valid JSON structure 
    // expected by Bags protocol or smart contracts, but we'll structure it perfectly.
    
    // Simulate API call just in case Bags validates config remotely
    // const data = await bagsFetch('/fee-share/config', { method: 'POST', ... })
    
    const feeShareConfig = {
      protocol: "Bags.fm",
      totalFeeBps: 100, // example total fee 1%
      splits: [
        {
          wallet: appTreasuryWallet,
          sharePercentage: 50,
          role: "App Treasury"
        },
        {
          wallet: curatorWallet,
          sharePercentage: 30,
          role: "Signal Curator"
        },
        {
          wallet: referrerWallet,
          sharePercentage: 20,
          role: "Referrer"
        }
      ]
    };
    
    console.log(`[BagsService] Generated Fee Share Config:`, JSON.stringify(feeShareConfig, null, 2));
    return feeShareConfig;
  } catch (err) {
    console.error(`[BagsService] buildFeeShareConfig failed:`, err.message);
    throw err;
  }
}

/**
 * claimFees(walletAddress)
 * → Builds a claim transaction for earned fees
 * → Returns the claim transaction object
 */
export async function claimFees(walletAddress) {
  try {
    const data = await bagsFetch('/fee-share/claim', {
      method: 'POST',
      body: JSON.stringify({ wallet: walletAddress }),
    });

    const configObj = data.claimTransaction || data.transaction || data.response || data;
    return configObj;
  } catch (err) {
    console.error(`[BagsService] claimFees failed:`, err.message);
    throw err;
  }
}

// Ensure all required functions exported
