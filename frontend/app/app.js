/**
 * CONVICTION — App Dashboard
 * Handles: Wallet Connect (Privy), Leaderboard, Quick Analyze, Portfolio
 */
const BACKEND = window.__BACKEND_URL__ || 'http://localhost:3000';
const HELIUS_KEY = window.__HELIUS_KEY__ || '';

/* ── STATE ── */
let walletAddress = null;
let leaderboardData = [];
let refreshInterval = null;
const REFRESH_SECS = 180; // 3 minutes
let refreshCountdown = REFRESH_SECS;

/* ── ELEMENT REFS ── */
const gateOverlay     = document.getElementById('gate-overlay');
const connectBtn      = document.getElementById('connect-btn');
const connectLabel    = document.getElementById('connect-label');
const connectDot      = document.getElementById('connect-dot');
const walletMenu      = document.getElementById('wallet-menu');
const disconnectBtn   = document.getElementById('disconnect-btn');
const gateConnectBtn  = document.getElementById('gate-connect-btn');
const leaderboardBody = document.getElementById('leaderboard-body');
const lbSkeleton      = document.getElementById('lb-skeleton');
const refreshLabel    = document.getElementById('refresh-label');
const qaInput         = document.getElementById('qa-input');
const qaBtn           = document.getElementById('qa-btn');
const qaBtnText       = document.getElementById('qa-btn-text');
const qaSpinner       = document.getElementById('qa-spinner');
const qaError         = document.getElementById('qa-error');
const qaResult        = document.getElementById('qa-result');
const portfolioBody   = document.getElementById('portfolio-body');
const portfolioEmpty  = document.getElementById('portfolio-empty');
const tokenPanel      = document.getElementById('token-panel');
const tokenPanelClose = document.getElementById('token-panel-close');
const tokenPanelContent = document.getElementById('token-panel-content');
const refreshPortfolioBtn = document.getElementById('refresh-portfolio-btn');

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 8 — WALLET CONNECT (Privy)
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Try to initialise Privy SDK if present.
 * Falls back to a simple demo mode that simulates connection.
 */
let privy = null;
window.privy = null; // expose for token.js

async function initPrivy() {
  try {
    if (typeof window.Privy !== 'undefined') {
      privy = new window.Privy({ appId: window.__PRIVY_APP_ID__ || '' });
      window.privy = privy;
    }
  } catch (e) {
    console.info('[Privy] SDK not loaded, using demo mode');
  }
}

async function connectWallet() {
  if (privy) {
    try {
      const loginResult = await privy.login();
      const addr = loginResult?.user?.wallet?.address;
      if (addr) { setWalletConnected(addr); return; }
    } catch (e) {
      console.warn('[Privy] connect failed:', e.message);
    }
  }
  // Demo mode: simulate a wallet
  const demoAddr = `Demo${Date.now().toString(36).toUpperCase().slice(-6)}`;
  setWalletConnected(demoAddr + '...4mNp');
}

async function disconnectWallet() {
  if (privy) {
    try { await privy.logout(); } catch(e) {}
  }
  setWalletDisconnected();
}

function setWalletConnected(addr) {
  walletAddress = addr;
  window.__walletAddress__ = addr; // expose for token.js
  try { localStorage.setItem('conviction_wallet', addr); } catch(e) {}
  if (window.__onWalletConnect__) window.__onWalletConnect__(addr);
  const short = addr.length > 14 ? `${addr.slice(0,6)}...${addr.slice(-4)}` : addr;
  connectLabel.textContent = short;
  connectDot.classList.add('online');
  connectBtn.classList.add('connected');
  if (gateOverlay) gateOverlay.classList.add('hidden');
  walletMenu.classList.add('hidden');
  if (typeof loadPortfolio === 'function') loadPortfolio();
}

function setWalletDisconnected() {
  walletAddress = null;
  window.__walletAddress__ = null;
  try { localStorage.removeItem('conviction_wallet'); } catch(e) {}
  if (window.__onWalletDisconnect__) window.__onWalletDisconnect__();
  connectLabel.textContent = 'Connect Wallet';
  connectDot.classList.remove('online');
  connectBtn.classList.remove('connected');
  if (gateOverlay) gateOverlay.classList.remove('hidden');
  clearPortfolio();
}

// Toggle wallet menu on click when connected
connectBtn.addEventListener('click', async () => {
  if (walletAddress) {
    walletMenu.classList.toggle('hidden');
  } else {
    await connectWallet();
  }
});

disconnectBtn?.addEventListener('click', async () => {
  walletMenu.classList.add('hidden');
  await disconnectWallet();
});

gateConnectBtn?.addEventListener('click', connectWallet);

// Close wallet menu when clicking outside
document.addEventListener('click', e => {
  if (!connectBtn.contains(e.target) && !walletMenu.contains(e.target)) {
    walletMenu.classList.add('hidden');
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 7A — LEADERBOARD
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function verdictClass(verdict) {
  if (!verdict) return 'weak';
  return verdict.toLowerCase();
}

function convictionDisplay(score) {
  const pct = Math.round((score || 0) * 100);
  return { pct, class: pct >= 75 ? 'strong' : pct >= 55 ? 'moderate' : pct >= 35 ? 'weak' : 'blocked' };
}

function formatNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n/1_000).toFixed(0)}K`;
  return `$${n}`;
}

function renderLeaderboard(tokens) {
  if (!tokens || tokens.length === 0) {
    leaderboardBody.innerHTML = '<div style="padding:40px;text-align:center;color:var(--grey-2);font-size:14px;">No tokens found. Check that the backend is running.</div>';
    return;
  }

  const rows = tokens.map((t, i) => {
    const cv = convictionDisplay(t.conviction);
    const vc = verdictClass(t.verdict);
    const symbol = t.tokenSymbol || '???';
    const volume = formatNum(t.volume || 0);
    const traders = t.activeTraders || '—';
    return `
      <div class="lb-row" data-address="${t.tokenAddress}" tabindex="0" role="button" aria-label="Analyze ${symbol}">
        <span class="lb-rank">${i + 1}</span>
        <div class="lb-token-info">
          <span class="lb-symbol">${symbol}</span>
          <span class="lb-name">${(t.tokenAddress || '').slice(0, 20)}...</span>
        </div>
        <div class="lb-score-wrap">
          <span class="lb-score-num ${vc}">${cv.pct}</span>
          <div class="lb-bar"><div class="lb-bar-fill ${vc}" style="width:${cv.pct}%"></div></div>
        </div>
        <span class="verdict-pill ${vc}">${(t.verdict || 'UNKNOWN').toUpperCase()}</span>
        <span class="lb-money">${volume}</span>
        <span class="lb-money">${traders}</span>
        <button class="lb-analyze-btn" data-address="${t.tokenAddress}">Analyze ›</button>
      </div>
    `;
  }).join('');

  leaderboardBody.innerHTML = rows;

  // Wire row click / analyze button → navigate to token.html
  leaderboardBody.querySelectorAll('.lb-analyze-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      window.location.href = `token.html?address=${encodeURIComponent(btn.dataset.address)}`;
    });
  });
  leaderboardBody.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', () => {
      window.location.href = `token.html?address=${encodeURIComponent(row.dataset.address)}`;
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter') window.location.href = `token.html?address=${encodeURIComponent(row.dataset.address)}`;
    });
  });
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(`${BACKEND}/api/tokens/latest`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    leaderboardData = data;
    renderLeaderboard(data);
  } catch (e) {
    leaderboardBody.innerHTML = `<div style="padding:40px;text-align:center;color:var(--grey-2);font-size:14px;">Could not load leaderboard. Make sure the backend is running at ${BACKEND}</div>`;
    console.warn('[Leaderboard] Fetch failed:', e.message);
  }
}

function startRefreshCycle() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshCountdown = REFRESH_SECS;
  refreshLabel.textContent = 'LIVE';

  fetchLeaderboard();

  const tick = setInterval(() => {
    refreshCountdown--;
    if (refreshCountdown <= 0) {
      refreshLabel.textContent = 'Refreshing...';
      fetchLeaderboard();
      refreshCountdown = REFRESH_SECS;
    } else {
      refreshLabel.textContent = `${refreshCountdown}s`;
    }
  }, 1000);

  refreshInterval = tick;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 7B — QUICK ANALYZE
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function setQaLoading(on) {
  qaBtn.disabled = on;
  qaBtnText.textContent = on ? 'Analyzing...' : 'Analyze';
  qaSpinner.classList.toggle('hidden', !on);
}

function renderQaResult(data) {
  const cv = convictionDisplay(data.conviction);
  const vc = verdictClass(data.verdict);

  const agentRows = (data.agentReports || []).map(a => {
    const scorePct = Math.round((a.score || 0) * 100);
    const reasons = (a.reasons || []).slice(0, 3).map(r => `<li>${r}</li>`).join('');
    return `
      <div class="qa-agent-card">
        <div class="qa-agent-name">${a.agentName || 'Agent'}</div>
        <div class="qa-agent-score ${scorePct >= 75 ? 'strong' : scorePct >= 40 ? 'moderate' : 'weak'}">${scorePct}</div>
        <ul class="qa-reasons">${reasons}</ul>
      </div>
    `;
  }).join('');

  qaResult.innerHTML = `
    <div class="qa-result-header">
      <div>
        <div class="qa-token-name">${data.tokenSymbol || 'Unknown Token'}</div>
        <div style="font-size:12px;color:var(--grey-2);margin-top:4px;">${data.tokenAddress}</div>
        <div style="font-size:13px;color:var(--grey-1);margin-top:8px;">${data.summary || ''}</div>
      </div>
      <div style="text-align:right;">
        <div class="qa-conviction-num ${vc}">${cv.pct}</div>
        <span class="verdict-pill ${vc}">${(data.verdict || '').toUpperCase()}</span>
      </div>
    </div>
    ${agentRows ? `<div class="qa-agents-grid">${agentRows}</div>` : ''}
    ${data.swapReady ? `<div style="margin-top:20px;padding:12px 16px;border-radius:10px;background:rgba(0,255,136,0.07);border:1px solid rgba(0,255,136,0.2);color:var(--green);font-size:13px;font-weight:600;">✓ SWAP READY — High conviction. Safe to trade.</div>` : ''}
  `;
  qaResult.classList.remove('hidden');
}

async function runQuickAnalyze() {
  const address = qaInput.value.trim();
  qaError.textContent = '';
  qaResult.classList.add('hidden');
  if (!address) { qaError.textContent = 'Please enter a token address.'; qaError.classList.remove('hidden'); return; }

  setQaLoading(true);
  qaError.classList.add('hidden');

  try {
    const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    renderQaResult(data);
  } catch (e) {
    qaError.textContent = 'Could not analyze this token. Check the address and try again.';
    qaError.classList.remove('hidden');
  } finally {
    setQaLoading(false);
  }
}

qaBtn?.addEventListener('click', runQuickAnalyze);
qaInput?.addEventListener('keydown', e => { if (e.key === 'Enter') runQuickAnalyze(); });

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 7C — TOKEN DETAIL PANEL
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function openTokenPanel(tokenAddress) {
  tokenPanelContent.innerHTML = `<div style="color:var(--grey-2);text-align:center;padding:40px;">Loading agent analysis...</div>`;
  tokenPanel.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Check sessionStorage for a pre-loaded result
  let data = null;
  try {
    const cached = sessionStorage.getItem('lastTokenResult');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.tokenAddress === tokenAddress) {
        data = parsed;
        sessionStorage.removeItem('lastTokenResult');
      }
    }
  } catch(e) {}

  if (!data) {
    try {
      const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(tokenAddress)}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      data = await res.json();
    } catch(e) {
      tokenPanelContent.innerHTML = `<div style="color:var(--red);text-align:center;padding:40px;">Failed to load token analysis. Is the backend running?</div>`;
      return;
    }
  }

  const cv = convictionDisplay(data.conviction);
  const vc = verdictClass(data.verdict);
  const agentRows = (data.agentReports || []).map(a => {
    const scorePct = Math.round((a.score || 0) * 100);
    const reasons = (a.reasons || []).slice(0, 5).map(r => `<li style="font-size:12px;color:var(--grey-1);">• ${r}</li>`).join('');
    return `<div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;color:var(--grey-1);">${a.agentName||'Agent'}</span>
        <span style="font-size:18px;font-weight:900;color:${scorePct>=75?'#00ff88':scorePct>=40?'#f5a623':'#888'}">${scorePct}</span>
      </div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:4px;">${reasons}</ul>
      <span style="font-size:11px;color:var(--grey-2);">Flag: ${a.flag || '—'} · confidence: ${Math.round((a.confidence||0)*100)}%</span>
    </div>`;
  }).join('');

  tokenPanelContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:16px;">
      <div>
        <h2 style="font-size:24px;font-weight:900;letter-spacing:-0.02em;">${data.tokenSymbol||'Unknown'}</h2>
        <div style="font-size:12px;color:var(--grey-2);font-family:monospace;margin-top:4px;">${data.tokenAddress}</div>
        <p style="font-size:14px;color:var(--grey-1);margin-top:12px;line-height:1.6;">${data.summary||''}</p>
      </div>
      <div style="text-align:center;flex-shrink:0;">
        <div style="font-size:48px;font-weight:900;color:${vc==='strong'?'#00ff88':vc==='moderate'?'#f5a623':vc==='blocked'?'#ff4444':'#888'}">${cv.pct}</div>
        <span class="verdict-pill ${vc}">${(data.verdict||'').toUpperCase()}</span>
      </div>
    </div>
    ${data.swapReady ? `<div style="margin-bottom:20px;padding:12px 16px;border-radius:10px;background:rgba(0,255,136,0.07);border:1px solid rgba(0,255,136,0.2);color:var(--green);font-size:13px;font-weight:600;">✓ SWAP READY</div>` : ''}
    <h3 style="font-size:14px;font-weight:700;color:var(--grey-1);margin-bottom:16px;text-transform:uppercase;letter-spacing:0.05em;">Agent Breakdown</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">${agentRows}</div>
    <div style="margin-top:24px;text-align:center;font-size:12px;color:var(--grey-2);">Analysis completed ${new Date(data.timestamp||Date.now()).toLocaleString()}</div>
  `;
}

function closeTokenPanel() {
  tokenPanel.classList.add('hidden');
  document.body.style.overflow = '';
}

tokenPanelClose?.addEventListener('click', closeTokenPanel);
tokenPanel?.addEventListener('click', e => { if (e.target === tokenPanel) closeTokenPanel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTokenPanel(); });

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 7C — PORTFOLIO
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function loadPortfolio() {
  if (!walletAddress) return;
  portfolioEmpty.textContent = 'Fetching your holdings...';
  portfolioEmpty.classList.remove('hidden');

  try {
    // Fetch token accounts from Helius (or backend proxy)
    let holdings = [];
    try {
      const res = await fetch(`${BACKEND}/api/portfolio?wallet=${encodeURIComponent(walletAddress)}`);
      if (res.ok) holdings = await res.json();
    } catch (e) {
      // Fallback: Helius direct (if key available)
      if (HELIUS_KEY) {
        const r = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
            params: [walletAddress, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
              { encoding: 'jsonParsed', commitment: 'confirmed' }] })
        });
        const data = await r.json();
        holdings = (data.result?.value || []).map(acc => {
          const info = acc.account?.data?.parsed?.info;
          return { mint: info?.mint, balance: info?.tokenAmount?.uiAmount };
        }).filter(h => h.balance > 0).slice(0, 20);
      }
    }

    if (!holdings || holdings.length === 0) {
      portfolioEmpty.innerHTML = 'No token holdings found for this wallet.';
      return;
    }

    portfolioEmpty.classList.add('hidden');
    portfolioBody.innerHTML = '';
    holdings.forEach(h => {
      const addr = h.mint || h.tokenAddress || 'Unknown';
      const bal  = h.balance !== undefined ? h.balance : (h.uiAmount || '—');
      const sym  = h.symbol || addr.slice(0, 8) + '...';
      const row  = document.createElement('div');
      row.className = 'portfolio-row';
      row.innerHTML = `
        <div class="pf-token">
          <span class="pf-symbol">${sym}</span>
          <span class="pf-addr">${addr.slice(0, 30)}...</span>
        </div>
        <span class="pf-balance">${bal}</span>
        <span class="pf-conviction loading" id="pf-cv-${addr.slice(0,8)}">Scoring...</span>
      `;
      portfolioBody.appendChild(row);

      // Lazy-load conviction score for each token
      fetchPortfolioScore(addr);
    });
  } catch (e) {
    portfolioEmpty.textContent = 'Could not load portfolio. Try again.';
    console.warn('[Portfolio] Error:', e.message);
  }
}

async function fetchPortfolioScore(addr) {
  const el = document.getElementById(`pf-cv-${addr.slice(0,8)}`);
  if (!el) return;
  try {
    const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(addr)}`);
    if (!res.ok) throw new Error('no data');
    const data = await res.json();
    const cv = convictionDisplay(data.conviction);
    const vc = verdictClass(data.verdict);
    el.textContent = `${cv.pct} · ${(data.verdict||'').toUpperCase()}`;
    el.className = `pf-conviction ${vc}`;
  } catch {
    el.textContent = '—';
    el.className = 'pf-conviction weak';
  }
}

function clearPortfolio() {
  portfolioBody.innerHTML = '';
  portfolioEmpty.textContent = 'Connect a wallet to view your portfolio.';
  portfolioEmpty.classList.remove('hidden');
  portfolioBody.appendChild(portfolioEmpty);
}

refreshPortfolioBtn?.addEventListener('click', loadPortfolio);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INIT
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function init() {
  await initPrivy();

  // Restore wallet from localStorage first (instant, no flicker)
  try {
    const saved = localStorage.getItem('conviction_wallet');
    if (saved) setWalletConnected(saved);
  } catch(e) {}

  // Check if Privy already has a session
  if (privy) {
    try {
      const user = await privy.getUser();
      if (user?.wallet?.address) {
        setWalletConnected(user.wallet.address);
      }
    } catch(e) {}
  }

  // Start leaderboard
  startRefreshCycle();

  // Resume any token panel from landing page redirect
  const params = new URLSearchParams(window.location.search);
  const redirectAddr = params.get('address');
  if (redirectAddr) {
    const cached = sessionStorage.getItem('lastTokenResult');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.tokenAddress === redirectAddr) {
          openTokenPanel(redirectAddr);
        }
      } catch(e) {}
    }
  }

  // Nav links smooth scroll
  document.querySelectorAll('.app-nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const id = link.getAttribute('href');
      document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.app-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

init();
