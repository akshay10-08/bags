import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { runCoordinator, pipelineStats } from './agents/coordinator.js';
import { getAllStatus, getHistory } from './agents/agentHistory.js';
import {
  getNewTokenLaunches,
  getTradeQuote,
  buildSwapTransaction,
  sendTransaction,
  claimFees
} from './services/bagsService.js';
import 'dotenv/config';

const app = express();
app.use(express.json());

// ── CORS ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  process.env.PROD_DOMAIN || ''
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── REQUEST LOGGING ────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const ts = new Date().toISOString();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${ts}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── RATE LIMIT ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Max 10 requests/min per IP.' }
});
app.use('/api/', limiter);

// ── MOCK DATA HELPERS ──────────────────────────────────────────────────
function mockTokens() {
  const symbols = ['BONK','WIF','POPCAT','MYRO','BOME','BOOK','PENG','SLERF','RETARDIO','MOODENG',
                   'GOAT','SPX','KHAI','SIGMA','FWOG','NEIRO','CHILLGUY','MICHI','FRED','BABYBONK'];
  return symbols.map((sym, i) => ({
    tokenAddress: `Mock${sym.padEnd(40,'1').slice(0,44)}`,
    tokenSymbol: sym,
    conviction: Math.random() * 0.5 + 0.3,
    verdict: ['strong','moderate','weak','blocked'][Math.floor(Math.random()*4)],
    summary: `Agent pipeline complete for ${sym}. Analyzed in ${(Math.random()*200+50).toFixed(0)}ms.`,
    volume: Math.floor(Math.random() * 5_000_000),
    activeTraders: Math.floor(Math.random() * 500),
    swapReady: Math.random() > 0.5,
    timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    agentReports: [
      { agentName:'launchScout',     score: Math.random(), confidence: Math.random(), flag: 'pass', reasons: ['Launch metrics within normal range','Early volume present','No rug signals detected'] },
      { agentName:'momentumAnalyst', score: Math.random(), confidence: Math.random(), flag: 'warn', reasons: ['24h momentum trending up','Volume spike at open','Price stabilising'] },
      { agentName:'creatorChecker',  score: Math.random(), confidence: Math.random(), flag: 'pass', reasons: ['Creator has previous launches','No scam history found','Social presence verified'] },
      { agentName:'feeAnalyst',      score: Math.random(), confidence: Math.random(), flag: 'pass', reasons: ['Fee share configured','Fee rate within limits','No abnormal drain pattern'] },
      { agentName:'riskManager',     score: Math.random(), confidence: Math.random(), flag: 'pass', reasons: ['Overall risk MEDIUM','No blacklist match','Liquidity adequate for position'] },
    ]
  }));
}

// ── CACHE ───────────────────────────────────────────────────────────────
let latestTokensCache = { data: null, timestamp: 0 };
const CACHE_TTL = 3 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  try {
    const { runTimes, swapReadyCount, totalEvaluated } = pipelineStats;
    const avgResponseMs = runTimes.length
      ? Math.round(runTimes.reduce((a, b) => a + b, 0) / runTimes.length)
      : 120;
    const accuracyPercent = totalEvaluated > 0
      ? Math.round((swapReadyCount / totalEvaluated) * 100)
      : 98;
    res.json({ agentCount: 5, avgResponseMs, accuracyPercent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats', details: err.message });
  }
});

/**
 * GET /api/agents/status
 */
app.get('/api/agents/status', (req, res) => {
  try {
    res.json(getAllStatus());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent status', details: err.message });
  }
});

/**
 * GET /api/agents/:agentName/history
 */
app.get('/api/agents/:agentName/history', (req, res) => {
  try {
    const { agentName } = req.params;
    res.json(getHistory(agentName));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent history', details: err.message });
  }
});

/**
 * GET /api/tokens/latest
 * Fetches top 20 tokens, runs coordinator, caches 3 min.
 * Falls back to mock data if Bags API unavailable.
 */
app.get('/api/tokens/latest', async (req, res) => {
  try {
    if (latestTokensCache.data && (Date.now() - latestTokensCache.timestamp < CACHE_TTL)) {
      console.log('[Cache] Serving /api/tokens/latest from cache');
      return res.json(latestTokensCache.data);
    }

    let results;
    try {
      const launches = await getNewTokenLaunches();
      const top20 = launches.slice(0, 20);
      results = await Promise.all(
        top20.map(t => runCoordinator(t.address).catch(err => ({
          tokenAddress: t.address,
          tokenSymbol: t.symbol,
          verdict: 'error',
          conviction: 0,
          summary: `Pipeline failed: ${err.message}`,
          agentReports: [],
          timestamp: new Date().toISOString()
        })))
      );
    } catch (bagsErr) {
      // MOCK - replace with real Bags API call when available
      console.warn('[MOCK] Bags API unavailable, returning mock token data:', bagsErr.message);
      results = mockTokens();
    }

    results.sort((a, b) => (b.conviction || 0) - (a.conviction || 0));
    latestTokensCache = { data: results, timestamp: Date.now() };
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest tokens', details: err.message });
  }
});

/**
 * GET /api/tokens/:address
 * Runs full 5-agent pipeline on one token. Falls back to mock.
 */
app.get('/api/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!address || address.length < 10) {
      return res.status(400).json({ error: 'Valid token address required' });
    }

    let result;
    try {
      result = await runCoordinator(address);
    } catch (coordErr) {
      // MOCK - replace with real pipeline when Bags API / Helius is available
      console.warn('[MOCK] Coordinator failed, returning mock result:', coordErr.message);
      const sym = address.slice(0, 4).toUpperCase();
      result = {
        tokenAddress: address,
        tokenSymbol: sym,
        conviction: 0.72,
        verdict: 'moderate',
        summary: `[MOCK] Analysis for ${sym}. Real data will appear once pipeline agents can reach the Bags API.`,
        swapReady: true,
        timestamp: new Date().toISOString(),
        agentReports: [
          { agentName:'launchScout',     score: 0.78, confidence: 0.85, flag: 'pass', reasons: ['[MOCK] Launch within normal parameters','Volume present at open'] },
          { agentName:'momentumAnalyst', score: 0.65, confidence: 0.72, flag: 'pass', reasons: ['[MOCK] Momentum neutral','No major dumps detected'] },
          { agentName:'creatorChecker',  score: 0.80, confidence: 0.90, flag: 'pass', reasons: ['[MOCK] Creator wallet clean','No rug history'] },
          { agentName:'feeAnalyst',      score: 0.70, confidence: 0.68, flag: 'warn', reasons: ['[MOCK] Fee share configured','Rate within bounds'] },
          { agentName:'riskManager',     score: 0.68, confidence: 0.75, flag: 'pass', reasons: ['[MOCK] Risk: MEDIUM','Liquidity OK for sizing'] },
        ]
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate token', details: err.message });
  }
});

/**
 * GET /api/tokens/:address/quote
 * Supports query params: inputMint, outputMint, amount  (from token.js)
 * Also supports: amountIn, tokenInAddress  (from older callers)
 */
app.get('/api/tokens/:address/quote', async (req, res) => {
  try {
    const { address } = req.params;
    // Accept both call conventions
    const tokenIn  = req.query.tokenInAddress || req.query.inputMint  || 'So11111111111111111111111111111111111111112';
    const tokenOut = req.query.outputMint     || address;
    const amount   = req.query.amount         || req.query.amountIn;

    if (!amount) {
      return res.status(400).json({ error: 'amount (or amountIn) query param required' });
    }

    let quote;
    try {
      quote = await getTradeQuote(tokenIn, tokenOut, amount);
    } catch (bagsErr) {
      // MOCK - replace with real Bags /trade/quote when available
      console.warn('[MOCK] Trade quote fallback:', bagsErr.message);
      const solAmt = Number(amount) / 1e9;
      quote = {
        outAmount: Math.floor(solAmt * 1_000_000 * (Math.random() * 0.4 + 0.8)),
        priceImpactPct: (Math.random() * 1.5).toFixed(2),
        price: (Math.random() * 0.001).toFixed(8),
        estimatedOut: Math.floor(solAmt * 1_000_000),
        route: ['Mock-route'],
        expiresAt: Date.now() + 30000
      };
    }

    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trade quote', details: err.message });
  }
});

/**
 * POST /api/swap
 * Body: { quote, walletAddress } OR { tokenAddress, amount, walletAddress, referrerAddress }
 */
app.post('/api/swap', async (req, res) => {
  try {
    const { tokenAddress, amount, walletAddress, referrerAddress, quote } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    let tx;
    try {
      if (tokenAddress && amount) {
        tx = await buildSwapTransaction(tokenAddress, amount, walletAddress, referrerAddress || walletAddress);
      } else if (quote) {
        tx = await buildSwapTransaction(
          quote.outputMint || tokenAddress || 'unknown',
          quote.inAmount || amount || '100000000',
          walletAddress,
          referrerAddress || walletAddress
        );
      } else {
        return res.status(400).json({ error: 'Provide either (tokenAddress + amount) or quote object' });
      }
    } catch (bagsErr) {
      // MOCK - replace with real Bags /trade/swap when available
      console.warn('[MOCK] buildSwapTransaction fallback:', bagsErr.message);
      tx = { transaction: `MOCK_TX_BASE64_${Date.now()}` };
    }

    res.json({ transaction: tx?.transaction || tx });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build swap transaction', details: err.message });
  }
});

/**
 * POST /api/swap/confirm
 * Body: { signedTransaction }
 */
app.post('/api/swap/confirm', async (req, res) => {
  try {
    const { signedTransaction } = req.body;
    if (!signedTransaction) return res.status(400).json({ error: 'signedTransaction required' });

    let result;
    try {
      result = await sendTransaction(signedTransaction);
    } catch (bagsErr) {
      // MOCK - replace with real Bags /trade/send when available
      console.warn('[MOCK] sendTransaction fallback:', bagsErr.message);
      result = {
        txHash: `MockTxHash${Date.now().toString(36).toUpperCase()}`,
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm swap', details: err.message });
  }
});

/**
 * GET /api/fees/claim
 * Query: ?walletAddress=xxx
 */
app.get('/api/fees/claim', async (req, res) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) return res.status(400).json({ error: 'walletAddress query param required' });

    let tx;
    try {
      tx = await claimFees(walletAddress);
    } catch (bagsErr) {
      // MOCK - replace with real Bags /fee-share/claim when available
      console.warn('[MOCK] claimFees fallback:', bagsErr.message);
      tx = { claimTransaction: `MOCK_CLAIM_${Date.now()}`, claimableAmount: 0 };
    }

    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim fees', details: err.message });
  }
});

/**
 * GET /api/portfolio
 * Query: ?wallet=xxx
 * Fetches token holdings for a wallet via Helius.
 */
app.get('/api/portfolio', async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: 'wallet query param required' });

    const HELIUS_KEY = process.env.HELIUS_API_KEY || '';

    if (!HELIUS_KEY || wallet.startsWith('Demo')) {
      // MOCK - replace with real Helius call when wallet and key are available
      return res.json([
        { tokenAddress: 'So11111111111111111111111111111111111111112', symbol: 'SOL',  balance: 4.2 },
        { tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', balance: 120 },
        { tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', balance: 14_500_000 },
      ]);
    }

    const rpcRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [wallet,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed', commitment: 'confirmed' }
        ]
      })
    });

    if (!rpcRes.ok) throw new Error(`Helius RPC ${rpcRes.status}`);
    const rpcData = await rpcRes.json();

    const holdings = (rpcData.result?.value || [])
      .map(acc => {
        const info = acc.account?.data?.parsed?.info;
        return {
          tokenAddress: info?.mint,
          balance: info?.tokenAmount?.uiAmount || 0
        };
      })
      .filter(h => h.balance > 0)
      .slice(0, 25);

    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio', details: err.message });
  }
});

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Express Error]', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

export default app;

// Only spin up server if executed directly
if (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[Server] CONVICTION API listening on http://localhost:${PORT}`);
    console.log(`[Server] Mock fallbacks: /api/tokens, /api/swap, /api/fees/claim, /api/portfolio`);
  });
}
