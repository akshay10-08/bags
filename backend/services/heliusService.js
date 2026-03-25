/**
 * heliusService.js
 * Helius RPC integration for Solana on-chain data
 * RPC URL: https://mainnet.helius-rpc.com/?api-key=HELIUS_API_KEY
 * Enhanced API: https://api.helius.xyz/v0
 */

import 'dotenv/config';

const getHeliusApiKey = () => {
  const key = process.env.HELIUS_API_KEY;
  if (!key) console.warn('[HeliusService] HELIUS_API_KEY is missing');
  return key || '';
};

const getRpcUrl = () => `https://mainnet.helius-rpc.com/?api-key=${getHeliusApiKey()}`;
const HELIUS_API_BASE = `https://api.helius.xyz/v0`;

/**
 * Internal RPC call wrapper
 */
async function rpcCall(method, params) {
  console.log(`\n[HeliusService] RPC → ${method}`);
  try {
    const res = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });

    if (!res.ok) throw new Error(`HeliusRPC HTTP ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(`HeliusRPC Error: ${json.error.message}`);

    console.log(`[HeliusService] ← RPC success`);
    return json.result;
  } catch (err) {
    console.error(`[HeliusService] ERROR in rpcCall(${method}):`, err.message);
    throw err;
  }
}

/**
 * Internal Helius Enhanced API call wrapper
 */
async function heliusFetch(path, params = {}) {
  const queryString = new URLSearchParams({ ...params, 'api-key': getHeliusApiKey() }).toString();
  const url = `${HELIUS_API_BASE}${path}?${queryString}`;
  console.log(`\n[HeliusService] → GET ${url.split('?')[0]}`);

  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Helius API HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }
    const data = await res.json();
    console.log(`[HeliusService] ← Response success`);
    return data;
  } catch (err) {
    console.error(`[HeliusService] ERROR calling API:`, err.message);
    throw err;
  }
}

/**
 * getTokenVolume(tokenAddress)
 * → Fetches 24h trading volume for a token
 * → Returns: { volume24h, volumeChange, volumeUSD }
 */
export async function getTokenVolume(tokenAddress) {
  try {
    const result = await rpcCall('getAsset', { 
      id: tokenAddress, 
      displayOptions: { showFungible: true } 
    });

    const priceInfo = result?.token_info?.price_info || {};
    
    // Some tokens on Helius DAS may omit exact 24h volume if not tracked.
    // We map what we can safely.
    const price = Number(priceInfo.price_per_token) || 0;
    const vol24h = Number(priceInfo.volume_24h) || 0;

    return {
      volume24h: vol24h,
      volumeChange: Number(priceInfo.volume_24h_change) || 0,
      volumeUSD: vol24h * price
    };
  } catch (err) {
    console.error(`[HeliusService] getTokenVolume failed:`, err.message);
    throw err;
  }
}

/**
 * getActiveTraders(tokenAddress)
 * → Fetches unique wallet count trading this token today
 * → Returns: { activeTraders, traderGrowth24h }
 */
export async function getActiveTraders(tokenAddress) {
  try {
    const txs = await heliusFetch(`/addresses/${tokenAddress}/transactions`, {
      limit: 100,
      type: 'SWAP',
    });

    const uniqueWallets = new Set();
    const oneDayAgo = (Date.now() / 1000) - 86400;

    if (Array.isArray(txs)) {
      for (const tx of txs) {
        if (tx.timestamp && tx.timestamp > oneDayAgo) {
          if (tx.feePayer) uniqueWallets.add(tx.feePayer);
        }
      }
    }

    return {
      activeTraders: uniqueWallets.size,
      traderGrowth24h: 0 // advanced historical growth requires multi-day streaming/indexing
    };
  } catch (err) {
    console.error(`[HeliusService] getActiveTraders failed:`, err.message);
    throw err;
  }
}

/**
 * getWalletHistory(walletAddress)
 * → Fetches recent transaction history for a wallet
 * → Returns array of: { signature, type, timestamp, tokenAddress, amount }
 */
export async function getWalletHistory(walletAddress) {
  try {
    const txs = await heliusFetch(`/addresses/${walletAddress}/transactions`, { 
      limit: 50 
    });

    if (!Array.isArray(txs)) return [];

    return txs.map(tx => {
      const transfer = tx.tokenTransfers?.[0] || {};
      return {
        signature: tx.signature || '',
        type: tx.type || 'UNKNOWN',
        timestamp: tx.timestamp || Date.now() / 1000,
        tokenAddress: transfer.mint || '',
        amount: Number(transfer.tokenAmount) || 0
      };
    });
  } catch (err) {
    console.error(`[HeliusService] getWalletHistory failed:`, err.message);
    throw err;
  }
}

/**
 * getTokenMetadata(tokenAddress)
 * → Fetches token metadata from Helius enhanced API
 * → Returns: { name, symbol, decimals, supply, logoUri }
 */
export async function getTokenMetadata(tokenAddress) {
  try {
    const result = await rpcCall('getAsset', { id: tokenAddress });
    
    return {
      name: result?.content?.metadata?.name || 'Unknown',
      symbol: result?.content?.metadata?.symbol || 'UNKNOWN',
      decimals: Number(result?.token_info?.decimals) || 0,
      supply: Number(result?.token_info?.supply) || 0,
      logoUri: result?.content?.links?.image || ''
    };
  } catch (err) {
    console.error(`[HeliusService] getTokenMetadata failed:`, err.message);
    throw err;
  }
}
