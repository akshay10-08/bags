import express from 'express';
import { getTradeQuote, sendSwapTransaction } from '../services/bagsService.js';
import { getReferrerWallet } from '../services/referralService.js';
import { buildFeeShareConfig } from '../services/feeShareService.js';

const router = express.Router();
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// POST /api/swap
router.post('/', async (req, res, next) => {
  try {
    const { tokenAddress, amount, walletAddress, referralKey } = req.body;
    
    if (!tokenAddress || !amount || !walletAddress) {
      return res.status(400).json({ success: false, error: 'Missing tokenAddress, amount, or walletAddress' });
    }

    // 1. Get a quote first (selling SOL for the token)
    // Needs to cleanly handle Bags API response formatting which can vary.
    const quoteData = await getTradeQuote(SOL_MINT, tokenAddress, amount);
    
    // We expect quoteData.response or quoteData itself to have the quote payload
    const quote = quoteData.response || quoteData;

    if (!quote) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve a valid trade quote' });
    }

    // 2. Fetch referral wallet and build fee split configs
    const referrerWallet = getReferrerWallet(referralKey);
    const feeSplits = buildFeeShareConfig(referrerWallet);

    // 3. Transact (Passing exactly as built by quote, plus our fee splits)
    // Note: Depends on final Bags API shape for submitting splits alongside quotes
    const swapResult = await sendSwapTransaction({
      quote,
      wallet: walletAddress,
      feeSplits,
      referralKey
    });

    res.json({ 
      success: true, 
      result: swapResult,
      economicData: {
        referrerWallet,
        feeSplits
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
