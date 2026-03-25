import express from 'express';
import { getNewTokenLaunches, getTradeQuote } from '../services/bagsService.js';
import { runTokenPipeline } from '../pipeline.js';

const router = express.Router();
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// GET /api/tokens/latest
router.get('/latest', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const feed = await getNewTokenLaunches();
    let tokens = feed?.response || [];
    
    // Safety check just in case Bags doesn't return an array
    if (!Array.isArray(tokens)) {
      tokens = [];
    }
    
    tokens = tokens.slice(0, limit);
    
    // Map pipeline across top tokens
    const results = await Promise.all(
      tokens.map(async (token) => {
        if (!token.tokenMint) return token;
        const pipelineResult = await runTokenPipeline(token.tokenMint);
        return {
          ...token,
          convictionContext: pipelineResult
        };
      })
    );
    
    res.json({ success: true, count: results.length, tokens: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/:address
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    const result = await runTokenPipeline(address);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/:address/quote
router.get('/:address/quote', async (req, res, next) => {
  try {
    const { address } = req.params;
    const amount = req.query.amount || 0.1; // Amount of SOL
    // Buy token using SOL
    const quoteData = await getTradeQuote(SOL_MINT, address, amount);
    
    res.json({
      success: true,
      quote: quoteData
    });
  } catch (err) {
    next(err);
  }
});

export default router;
