/**
 * token.js — CONVICTION Token Detail Page
 * Handles: data loading, agent card expand/collapse, swap flow
 */

const BACKEND = window.__BACKEND_URL__ || 'http://localhost:3000';

/* ── WALLET STATE (synced with app.js which runs first) ── */
let walletAddress = window.__walletAddress__ || (() => { try { return localStorage.getItem('conviction_wallet'); } catch(e) { return null; } })();

// Bridge: if app.js exposed a global we read it on load
function syncWallet() {
  walletAddress = window.__walletAddress__ || null;
  updateSwapLock();
}

/* ── URL PARAMS ── */
const params = new URLSearchParams(window.location.search);
const TOKEN_ADDRESS = params.get('address') || '';

/* ── ELEMENT REFS ── */
const tkLoading   = document.getElementById('tk-loading');
const tkError     = document.getElementById('tk-error');
const tkMain      = document.getElementById('tk-main');
const tkErrorTitle = document.getElementById('tk-error-title');
const tkErrorMsg  = document.getElementById('tk-error-msg');

/* ── AGENT METADATA ── */
const AGENT_META = {
  launchScout:     { name: 'Launch Scout',     file: 'launchScout.js',     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M16.5 16.5l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  momentumAnalyst: { name: 'Momentum Analyst', file: 'momentumAnalyst.js', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="3,17 9,11 13,15 21,7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15,7 21,7 21,13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  creatorChecker:  { name: 'Creator Checker',  file: 'creatorChecker.js',  icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  feeAnalyst:      { name: 'Fee Analyst',      file: 'feeAnalyst.js',      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v1.5m0 7V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  riskManager:     { name: 'Risk Manager',     file: 'riskManager.js',     icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 8v5M12 16v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATA LOADING
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function verdictClass(verdict) {
  const v = (verdict || '').toLowerCase();
  return v === 'strong' ? 'strong' : v === 'moderate' ? 'moderate' : v === 'blocked' ? 'blocked' : 'weak';
}

function convictionPct(score) {
  return Math.round((score || 0) * 100);
}

function scoreColor(pct) {
  return pct >= 75 ? '#00ff88' : pct >= 55 ? '#f5a623' : pct >= 35 ? '#888888' : '#ff4444';
}

function timeAgo(isoStr) {
  if (!isoStr) return 'just now';
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function loadToken() {
  if (!TOKEN_ADDRESS) {
    showError('No address provided', 'Add ?address=... to the URL.');
    return;
  }

  // Try sessionStorage cache first (populated from modal/dashboard)
  let data = null;
  try {
    const cached = sessionStorage.getItem('lastTokenResult');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.tokenAddress === TOKEN_ADDRESS) {
        data = parsed;
        sessionStorage.removeItem('lastTokenResult');
      }
    }
  } catch(e) {}

  if (!data) {
    try {
      const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(TOKEN_ADDRESS)}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      data = await res.json();
    } catch(e) {
      showError('Analysis failed', 'Backend did not respond. Make sure the server is running.');
      return;
    }
  }

  renderPage(data);
}

function showError(title, msg) {
  tkLoading.classList.add('hidden');
  tkError.classList.remove('hidden');
  tkErrorTitle.textContent = title;
  tkErrorMsg.textContent = msg;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAGE RENDER
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function renderPage(data) {
  tkLoading.classList.add('hidden');
  tkMain.classList.remove('hidden');

  const pct = convictionPct(data.conviction);
  const vc  = verdictClass(data.verdict);
  const symbol = data.tokenSymbol || 'TOKEN';
  const addr   = data.tokenAddress || TOKEN_ADDRESS;

  // Breadcrumb
  document.getElementById('tk-symbol-breadcrumb').textContent = symbol;
  document.title = `CONVICTION — ${symbol}`;

  // Token identity
  document.getElementById('tk-symbol-badge').textContent = symbol.slice(0, 4).toUpperCase();
  document.getElementById('tk-symbol').textContent = symbol;
  document.getElementById('tk-address').textContent =
    addr.length > 28 ? `${addr.slice(0, 14)}...${addr.slice(-8)}` : addr;

  // Copy
  document.getElementById('tk-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(addr).then(() => {
      const btn = document.getElementById('tk-copy-btn');
      btn.title = 'Copied!';
      btn.style.color = '#00ff88';
      setTimeout(() => { btn.style.color = ''; btn.title = 'Copy address'; }, 2000);
    });
  });

  // Summary + meta
  document.getElementById('tk-summary').textContent = data.summary || 'No summary available.';
  document.getElementById('tk-timestamp').textContent = timeAgo(data.timestamp);

  // Score + verdict
  const scoreEl = document.getElementById('tk-score-num');
  scoreEl.textContent = pct;
  scoreEl.className = `tk-score-num ${vc}`;

  const verdictEl = document.getElementById('tk-verdict-pill');
  verdictEl.textContent = (data.verdict || '—').toUpperCase();
  verdictEl.className = `verdict-pill tk-verdict-pill ${vc}`;

  // Re-analyze
  document.getElementById('tk-reanalyze-btn').addEventListener('click', async () => {
    const btn = document.getElementById('tk-reanalyze-btn');
    btn.textContent = 'Analyzing...';
    btn.disabled = true;
    try {
      const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(TOKEN_ADDRESS)}`);
      const newData = await res.json();
      renderPage(newData);
    } catch(e) {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.innerHTML = '↺ Re-analyze'; btn.disabled = false; }, 2000);
    }
  });

  // Agent cards
  renderAgentCards(data.agentReports || []);

  // Swap section
  renderSwapPanel(data, symbol);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AGENT CARDS
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function renderAgentCards(reports) {
  const grid = document.getElementById('tk-agents-grid');
  if (!reports || reports.length === 0) {
    grid.innerHTML = '<p style="color:var(--grey-2);font-size:13px;">No agent data available.</p>';
    return;
  }

  grid.innerHTML = reports.map((a, i) => {
    const meta   = AGENT_META[a.agentName] || { name: a.agentName, file: a.agentName + '.js', icon: '' };
    const pct    = convictionPct(a.score);
    const vc     = pct >= 75 ? 'strong' : pct >= 55 ? 'moderate' : pct >= 35 ? 'weak' : 'blocked';
    const color  = scoreColor(pct);
    const flag   = (a.flag || 'pass').toLowerCase();
    const flagLbl = flag === 'block' ? 'BLOCK' : flag === 'warn' ? 'WARN' : 'PASS';
    const confPct = Math.round((a.confidence || 0) * 100);

    const reasonItems = (a.reasons || []).map(r =>
      `<li>${escHtml(r)}</li>`
    ).join('');

    return `
      <div class="tk-agent-card" id="agent-card-${i}">
        <div class="tk-agent-header" role="button" tabindex="0" aria-expanded="false"
          onclick="toggleAgent(${i})" onkeydown="if(event.key==='Enter'||event.key===' ')toggleAgent(${i})">
          <div class="tk-agent-icon">${meta.icon}</div>
          <div class="tk-agent-title-group">
            <div class="tk-agent-name">${escHtml(meta.name)}</div>
            <div class="tk-agent-file">${escHtml(meta.file)}</div>
          </div>
          <div class="tk-agent-score-wrap">
            <span class="tk-agent-score-num" style="color:${color}">${pct}</span>
            <div class="tk-agent-mini-bar">
              <div class="tk-agent-mini-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>
          <span class="tk-agent-flag-badge ${flag}">${flagLbl}</span>
          <svg class="tk-agent-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="tk-agent-body" id="agent-body-${i}">
          <div class="tk-agent-body-inner">
            <div class="tk-agent-stats-row">
              <div class="tk-agent-stat">
                <span class="tk-agent-stat-label">Score</span>
                <span class="tk-agent-stat-val" style="color:${color}">${pct}/100</span>
              </div>
              <div class="tk-agent-stat">
                <span class="tk-agent-stat-label">Confidence</span>
                <span class="tk-agent-stat-val">${confPct}%</span>
              </div>
              <div class="tk-agent-stat">
                <span class="tk-agent-stat-label">Flag</span>
                <span class="tk-agent-flag-badge ${flag}" style="width:fit-content">${flagLbl}</span>
              </div>
            </div>
            ${reasonItems ? `<ul class="tk-reasons-list">${reasonItems}</ul>` : '<p style="font-size:13px;color:var(--grey-2);">No reasons provided.</p>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleAgent = function(i) {
  const card = document.getElementById(`agent-card-${i}`);
  if (!card) return;
  card.classList.toggle('open');
  const header = card.querySelector('.tk-agent-header');
  if (header) header.setAttribute('aria-expanded', card.classList.contains('open'));
};

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SWAP PANEL
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

let currentQuote = null; // holds the latest quote object from backend

function renderSwapPanel(data, symbol) {
  const swapSection = document.getElementById('tk-swap-section');
  const vc = verdictClass(data.verdict);

  // Blocked tokens → dim panel
  if (vc === 'blocked') {
    swapSection.classList.add('blocked-mode');
  }

  document.getElementById('swap-symbol').textContent = symbol;
  document.getElementById('swap-out-currency').textContent = symbol;

  // Wallet lock
  syncWallet();

  // Listen to SOL input for live quote
  const solInput = document.getElementById('swap-sol-input');
  let quoteTimer;
  solInput.addEventListener('input', () => {
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(() => fetchQuote(), 800);
  });

  document.getElementById('swap-quote-btn').addEventListener('click', fetchQuote);
  document.getElementById('swap-main-btn').addEventListener('click', executeSwap);
  document.getElementById('swap-share-btn').addEventListener('click', shareEarn);
  document.getElementById('swap-connect-btn')?.addEventListener('click', () => {
    // Trigger the navbar connect button
    document.getElementById('connect-btn')?.click();
  });

  // Fetch initial price
  fetch(`${BACKEND}/api/tokens/${encodeURIComponent(TOKEN_ADDRESS)}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${TOKEN_ADDRESS}&amount=100000000`)
    .then(r => r.json())
    .then(q => { document.getElementById('swap-price').textContent = q.price ? `$${Number(q.price).toFixed(6)}` : '—'; })
    .catch(() => {});
}

async function fetchQuote() {
  const solInput = document.getElementById('swap-sol-input');
  const outInput = document.getElementById('swap-out-input');
  const impactWarn = document.getElementById('swap-impact-warn');
  const mainBtn = document.getElementById('swap-main-btn');

  const sol = parseFloat(solInput.value);
  if (!sol || sol <= 0) { outInput.value = '—'; return; }

  const lamports = Math.floor(sol * 1e9);
  outInput.value = 'Getting quote...';

  try {
    const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(TOKEN_ADDRESS)}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${TOKEN_ADDRESS}&amount=${lamports}`);
    if (!res.ok) throw new Error('Quote failed');
    const q = await res.json();
    currentQuote = q;

    const outAmt = q.outAmount ? (q.outAmount / 1e6).toFixed(4) : '—';
    outInput.value = outAmt;

    // Price impact check
    const impact = parseFloat(q.priceImpactPct || 0);
    if (impact > 2) {
      document.getElementById('swap-impact-pct').textContent = `${impact.toFixed(2)}%`;
      impactWarn.classList.remove('hidden');
    } else {
      impactWarn.classList.add('hidden');
    }

    if (walletAddress) {
      mainBtn.disabled = false;
      mainBtn.className = 'swap-main-btn';
    }
  } catch(e) {
    outInput.value = 'Quote failed';
    currentQuote = null;
    console.warn('[Swap] Quote error:', e.message);
  }
}

function setSwapState(state) {
  const btn     = document.getElementById('swap-main-btn');
  const btnText = document.getElementById('swap-btn-text');
  const spinner = document.getElementById('swap-btn-spinner');
  const txResult = document.getElementById('swap-tx-result');
  const txMsg    = document.getElementById('swap-tx-msg');
  const txLink   = document.getElementById('swap-tx-link');

  spinner.classList.add('hidden');
  txResult.classList.add('hidden');
  txLink.classList.add('hidden');
  btn.disabled   = false;
  btn.className  = 'swap-main-btn';

  switch(state.type) {
    case 'idle':
      btnText.textContent = 'Swap';
      btn.disabled = !walletAddress || !currentQuote;
      break;
    case 'loading':
      btnText.textContent = state.label || 'Working...';
      spinner.classList.remove('hidden');
      btn.disabled = true;
      break;
    case 'success':
      btnText.textContent = '✓ Swapped!';
      btn.className = 'swap-main-btn success';
      btn.disabled = true;
      txMsg.textContent = 'Transaction confirmed.';
      txResult.classList.remove('hidden');
      if (state.txHash) {
        txLink.href = `https://solscan.io/tx/${state.txHash}`;
        txLink.classList.remove('hidden');
      }
      break;
    case 'error':
      btnText.textContent = '✗ Swap failed — try again';
      btn.className = 'swap-main-btn error-state';
      btn.disabled  = false;
      break;
  }
}

async function executeSwap() {
  if (!walletAddress) { document.getElementById('connect-btn').click(); return; }
  if (!currentQuote)  { await fetchQuote(); return; }

  try {
    // Step 1: Getting quote
    setSwapState({ type: 'loading', label: 'Getting quote...' });

    // Step 2: Build transaction
    const buildRes = await fetch(`${BACKEND}/api/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: currentQuote, walletAddress }),
    });
    if (!buildRes.ok) throw new Error(`Build failed: ${buildRes.status}`);
    const { transaction } = await buildRes.json();

    // Step 3: Prompt wallet to sign
    setSwapState({ type: 'loading', label: 'Confirm in wallet...' });

    let signedTransaction;
    if (window.privy) {
      try {
        signedTransaction = await window.privy.signTransaction(transaction);
      } catch(e) {
        throw new Error('User rejected transaction');
      }
    } else {
      // Demo mode: simulate signing
      await new Promise(r => setTimeout(r, 1500));
      signedTransaction = transaction + '_simSigned';
    }

    // Step 4: Submit
    setSwapState({ type: 'loading', label: 'Swapping...' });

    const confirmRes = await fetch(`${BACKEND}/api/swap/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTransaction }),
    });
    if (!confirmRes.ok) throw new Error(`Confirm failed: ${confirmRes.status}`);
    const { txHash } = await confirmRes.json();

    setSwapState({ type: 'success', txHash });
    currentQuote = null;
  } catch(e) {
    console.error('[Swap] Error:', e.message);
    setSwapState({ type: 'error' });
    setTimeout(() => setSwapState({ type: 'idle' }), 4000);
  }
}

function updateSwapLock() {
  const lockedOverlay = document.getElementById('swap-locked-overlay');
  if (!lockedOverlay) return;
  if (walletAddress) {
    lockedOverlay.classList.add('hidden');
  } else {
    lockedOverlay.classList.remove('hidden');
  }
  const mainBtn = document.getElementById('swap-main-btn');
  if (mainBtn) mainBtn.disabled = !walletAddress || !currentQuote;
}

function shareEarn() {
  const url = `${window.location.origin}/app/token.html?address=${TOKEN_ADDRESS}&ref=${(walletAddress || 'anon').slice(0, 8)}`;
  if (navigator.share) {
    navigator.share({ title: 'CONVICTION Analysis', url });
  } else {
    navigator.clipboard.writeText(url).then(() => alert('Referral link copied!'));
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WALLET SYNC (from app.js globals)
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// app.js sets window.__walletAddress__ when wallet connects
// We poll until it's set, then sync
const syncPoll = setInterval(() => {
  if (window.__walletAddress__ !== undefined) {
    walletAddress = window.__walletAddress__;
    updateSwapLock();
    clearInterval(syncPoll);
  }
}, 300);

// Also wire the connect button from app.js connect flow
window.__onWalletConnect__ = (addr) => {
  walletAddress = addr;
  updateSwapLock();
};

window.__onWalletDisconnect__ = () => {
  walletAddress = null;
  updateSwapLock();
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

loadToken();
