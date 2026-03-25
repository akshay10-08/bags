# CONVICTION — Project Documentation
> Multi-agent token discovery and trading terminal for Bags.fm / Solana
> Built for the Bags.fm Q1 2026 Hackathon

---

## 1. WHAT IS CONVICTION?

Conviction is a Bags-native web app where 5 specialised AI agents 
collaborate to discover, score, and surface high-potential Solana tokens 
from the Bags.fm ecosystem. Users see a live leaderboard of tokens ranked 
by a "conviction score" — a weighted consensus from all 5 agents — and can 
swap directly inside the app in one click.

**One-line pitch:**
Conviction is the AI brain for Bags — it finds the tokens worth trading 
before everyone else does.

**Hackathon tracks:**
- AI Agents
- Bags API
- Fee Sharing
- DeFi

---

## 2. CORE USER FLOW

1. User opens Conviction
2. Sees live leaderboard of newly launched Bags/Solana tokens
3. Each token has a conviction score (0–100) updated every few minutes
4. User clicks a token → sees why the swarm likes it (agent reasoning)
5. User clicks "Swap" → Privy wallet signs → trade executes via Bags API
6. App fee is split onchain via Bags fee-sharing between:
   - App treasury (50%)
   - Signal curator (30%)
   - Referrer (20%)

---

## 3. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, React |
| Wallet | Privy SDK (embedded wallet, no Phantom needed) |
| Backend | Node.js, Express |
| AI Agents | Claude API via @anthropic-ai/sdk (claude-sonnet-4-20250514) |
| Solana data | Helius RPC + Helius streaming |
| Token data | Bags API |
| Live events | Bags ReStream (beta) |
| Liquidity | Meteora pools API |
| Deployment | Vercel (frontend), Railway (backend) |

---

## 4. ENVIRONMENT VARIABLES

```
ANTHROPIC_API_KEY=          # Claude API — all agent calls
BAGS_API_KEY=               # Bags.fm API — token data, swaps, fees
HELIUS_API_KEY=             # Helius — Solana RPC + volume data
PRIVY_APP_ID=               # Privy — wallet infrastructure
NEXT_PUBLIC_PRIVY_APP_ID=   # Same value as PRIVY_APP_ID (public)
```

---

## 5. PROJECT FOLDER STRUCTURE

```
/conviction
  /frontend
    /app
      page.tsx              → homepage leaderboard
      /token/[address]
        page.tsx            → token detail + agent reasoning + swap
    /components
      Leaderboard.tsx       → live ranked token list
      TokenCard.tsx         → single token row with score
      AgentPanel.tsx        → shows each agent's score + reasons
      SwapButton.tsx        → one-click swap via Bags API
      ConvictionBadge.tsx   → visual score indicator (strong/moderate/weak)
    /lib
      bagsClient.ts         → frontend Bags API wrapper
      privyConfig.ts        → Privy setup
  /backend
    /agents
      launchScout.js        → scores new token launches
      momentumAnalyst.js    → scores trading momentum
      creatorChecker.js     → scores creator reputation
      feeAnalyst.js         → scores fee health
      riskManager.js        → rule-based risk gate (no LLM)
      coordinator.js        → aggregates all scores
    /api
      tokens.js             → GET /api/tokens/latest
      token.js              → GET /api/tokens/:address
      swap.js               → POST /api/swap
      quote.js              → GET /api/tokens/:address/quote
    /services
      bagsService.js        → all Bags API calls
      heliusService.js      → Helius RPC calls
      meteoraService.js     → Meteora pool data
      feeShareService.js    → Bags fee-share config + claims
    /prompts
      launchScoutPrompt.js
      momentumPrompt.js
      creatorPrompt.js
      feePrompt.js
    agentRunner.js          → shared Claude API wrapper
  /shared
    types.js                → shared data schemas
    constants.js            → weights, thresholds, config
  .env
  .env.example
  README.md
```

---

## 6. THE 5 AGENTS

### Agent 1 — Launch Scout
- **Job:** Identifies newly launched tokens with early traction signals
- **Bags API calls:** token launch feed, token creator lookup
- **Scores:** launch recency, creator verification, first-hour activity
- **Weight in coordinator:** 20%

### Agent 2 — Momentum Analyst
- **Job:** Tracks trading momentum and swap velocity
- **Data:** Helius volume, active traders, Bags swap count
- **Scores:** 24h volume growth, unique trader count, swap frequency
- **Weight in coordinator:** 30%

### Agent 3 — Creator Checker
- **Job:** Checks the token creator's onchain reputation
- **Bags API calls:** creator profile, wallet history via Helius
- **Scores:** wallet age, past successful tokens, rug history
- **Weight in coordinator:** 25%

### Agent 4 — Fee Analyst
- **Job:** Analyses fee generation and claim patterns
- **Bags API calls:** lifetime fees, claim events
- **Scores:** fee consistency, healthy claim frequency, drain patterns
- **Weight in coordinator:** 25%

### Agent 5 — Risk Manager (rule-based, no LLM)
- **Job:** Hard gate that blocks obvious low-quality tokens
- **Logic:**
  - if any agent score < 0.2 → BLOCK
  - if creator agent flag = block → BLOCK
  - if 3+ agents score < 0.4 → WARN
  - otherwise → PASS
- **Output:** { flag: "pass" | "warn" | "block", blockedBy, warnings }

---

## 7. AGENT OUTPUT FORMAT

Every LLM agent returns this exact JSON:

```json
{
  "agentName": "launchScout",
  "score": 0.78,
  "confidence": 0.85,
  "reasons": [
    "Token launched 47 minutes ago with strong early volume",
    "Creator has 3 previously successful tokens on Bags",
    "First-hour trader count is in top 5% of recent launches"
  ],
  "flag": "pass"
}
```

---

## 8. COORDINATOR LOGIC

```text
Input: outputs from all 5 agents

If riskManager.flag === "block":
  → return { conviction: 0, verdict: "blocked" }

Otherwise:
  conviction = (
    launchScout.score   * 0.20 +
    momentumAnalyst.score * 0.30 +
    creatorChecker.score * 0.25 +
    feeAnalyst.score    * 0.25
  ) * launchScout.confidence (average)

Verdict mapping:
  conviction > 0.75 → "strong"
  conviction > 0.55 → "moderate"
  conviction > 0.35 → "weak"
  else             → "blocked"

swapReady = conviction > 0.65
```

**Coordinator final output:**
```json
{
  "tokenAddress": "So11...",
  "tokenSymbol": "EXAMPLE",
  "conviction": 0.72,
  "verdict": "strong",
  "summary": "High-momentum new launch from a verified creator with healthy fee flow.",
  "swapReady": true,
  "agentReports": [ ...all 5 agent outputs... ],
  "timestamp": "2026-03-22T10:00:00Z"
}
```

---

## 9. BAGS API ENDPOINTS USED

| Function | Endpoint | Used by |
|----------|----------|---------|
| New token launches | Bags token launch feed | Launch Scout |
| Token creator info | Bags creator lookup | Launch Scout, Creator Checker |
| Lifetime fees | Bags lifetime fees | Fee Analyst |
| Claim events | Bags claim events | Fee Analyst |
| Fee-share config | Bags fee-share config | Fee Share Service |
| Trade quote | Bags trade quote | Swap flow |
| Build swap tx | Bags swap transaction | Swap flow |
| Send transaction | Bags send transaction | Swap flow |
| Claim fees | Bags claim transaction | Revenue distribution |

---

## 10. BACKEND API ROUTES

```text
GET  /api/tokens/latest
     → returns top 20 tokens from Bags feed with conviction scores
     → refreshes every 3 minutes

GET  /api/tokens/:address
     → runs full 5-agent pipeline on one token
     → returns complete coordinator output

GET  /api/tokens/:address/quote
     → calls Bags trade quote API
     → returns { price, priceImpact, estimatedOut, route }

POST /api/swap
     body: { tokenAddress, amount, walletAddress, referrerAddress }
     → builds swap transaction via Bags API
     → returns { txHash, status }
```

---

## 11. FEE SHARING SETUP

Conviction earns revenue from every swap made through the app.
Revenue is split onchain using Bags fee-share config:

```text
App treasury wallet:   50%
Signal curator:        30%  (top contributor who flagged the token)
Referrer:              20%  (whoever referred the user)
```

Every swap call includes the referrer address as a param.
Users can generate referral links from inside the app.
Fees are claimable onchain at any time via the Bags claim transaction API.

---

## 12. FRONTEND DESIGN DIRECTION

**Aesthetic:** Dark terminal / trading desk. Professional but alive.
**Feel:** Bloomberg meets crypto native. Data-dense but scannable.

**Color palette:**
- Background: near-black `#0a0a0a`
- Surface cards: `#111111`
- Borders: `#1e1e1e`
- Primary accent: electric green `#00ff88` (conviction = strong)
- Warn accent: amber `#f5a623`
- Block/danger: red `#ff4444`
- Text primary: `#f0f0f0`
- Text secondary: `#888888`

**Key UI components:**

1. **Leaderboard** — live ranked list, auto-refreshes, conviction score 
   shown as a coloured bar (green/amber/red)

2. **Token detail page** — shows:
   - Token name, symbol, age, creator
   - Big conviction score number (0–100)
   - Verdict badge (STRONG / MODERATE / WEAK / BLOCKED)
   - Agent breakdown panel: each agent's score, confidence, 
     3–5 reasons in plain English
   - Live swap panel: amount input, price quote, one-click swap button

3. **Swap button states:**
   - Default: "Swap [TOKEN]"
   - Loading: "Getting quote..."
   - Ready: "Swap for 0.05 SOL"
   - Confirming: "Confirm in wallet..."
   - Done: "Swapped ✓"

4. **ConvictionBadge:**
   - STRONG → green pill
   - MODERATE → amber pill
   - WEAK → gray pill
   - BLOCKED → red pill with lock icon

---

## 13. AGENT RUNNER (agentRunner.js)

Shared utility used by all LLM agents:

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runAgent(agentName, systemPrompt, tokenData) {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyse this token and return your assessment as JSON:
          ${JSON.stringify(tokenData, null, 2)}
          
          Return ONLY valid JSON in this exact format:
          {
            "agentName": "${agentName}",
            "score": <number 0-1>,
            "confidence": <number 0-1>,
            "reasons": [<3-5 plain English strings>],
            "flag": "<pass|warn|block>"
          }`
        }
      ]
    });

    const raw = message.content[0].text;
    const parsed = JSON.parse(raw);
    console.log(`[${agentName}] score: ${parsed.score} | flag: ${parsed.flag}`);
    return parsed;

  } catch (error) {
    console.error(`[${agentName}] failed:`, error.message);
    return {
      agentName,
      score: 0.5,
      confidence: 0.1,
      reasons: ['Agent failed to run — defaulting to neutral score'],
      flag: 'warn'
    };
  }
}

module.exports = { runAgent };
```

---

## 14. HACKATHON REQUIREMENTS CHECKLIST

| Requirement | How Conviction meets it |
|-------------|------------------------|
| Must use Bags | ✓ Bags API for token data, swaps, fees, claims |
| Must have Bags token | ✓ Conviction app token launched via Bags |
| Fee sharing app | ✓ 3-way onchain split on every swap |
| Verifiable onchain | ✓ All swaps + fee claims are public txs |
| Real users + transactions | ✓ Built-in swap drives real onchain volume |
| AI Agents track | ✓ 5-agent swarm with coordinator |
| Ship to win | ✓ Full product, not a prototype |

---

## 15. KEY RULES FOR ALL CODE

1. Never hardcode API keys — always use `process.env`
2. Every async function must have try/catch with clear error messages
3. Console.log input and output of every agent run for debugging
4. All agent system prompts live in `/backend/prompts/` as separate files
5. Keep agent output format consistent — always the same JSON schema
6. Rate limit all API routes: max 10 requests/min per IP
7. All frontend API calls go through `/api/` routes — never call Bags API directly from frontend
8. Privy handles all wallet signing — never handle private keys directly

---

*This document is the single source of truth for the Conviction project.
Always refer back to this when making architectural decisions.*
