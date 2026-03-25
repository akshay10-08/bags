// ─────────────────────────────────────────────────────────────────
//  CONVICTION — Landing Page JavaScript
// ─────────────────────────────────────────────────────────────────

/* ── DOT-GRID + STAR CANVAS BACKGROUND ── */
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, dots = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function buildDots() {
    dots = [];
    const spacing = 48;
    for (let x = 0; x <= W; x += spacing) {
      for (let y = 0; y <= H + 600; y += spacing) {
        dots.push({ x, y, base: y, r: Math.random() * 0.8 + 0.2, o: Math.random() * 0.35 + 0.05 });
      }
    }
  }

  let scrollY = 0;
  window.addEventListener('scroll', () => { scrollY = window.scrollY; });

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Dot grid
    dots.forEach(d => {
      const parallax = scrollY * 0.08;
      const screenY  = d.y - parallax;
      if (screenY < -10 || screenY > H + 10) return;
      ctx.beginPath();
      ctx.arc(d.x, screenY, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${d.o})`;
      ctx.fill();
    });

    // Random twinkling star field
    for (let i = 0; i < 3; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); buildDots(); });
  resize();
  buildDots();
  draw();
})();

/* ── NAVBAR SCROLL EFFECT ── */
(function initNav() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });
})();

/* ── SCROLL REVEAL ── */
(function initReveal() {
  const items = document.querySelectorAll(
    '.pipeline-step, .agent-card, .metric-item, .section-badge, .section-title, .section-sub, .trust-logo, .cta-title, .cta-sub, .cta-actions, .cta-snippet'
  );

  items.forEach((el, i) => {
    el.classList.add('reveal');
    // stagger children within same parent
    const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const idx = siblings.indexOf(el);
    if (idx > 0) el.classList.add(`reveal-delay-${Math.min(idx, 4)}`);
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach(el => observer.observe(el));
})();

/* ── COUNT-UP ANIMATION ── */
(function initCountUp() {
  function animateCount(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start    = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(ease * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-target], .count-up').forEach(el => {
    const target = el.dataset.target;
    if (target) observer.observe(el);
  });
})();

/* ── HERO STAT COUNT UP ── */
(function initHeroStats() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const vals = entry.target.querySelectorAll('.hstat-val[data-target]');
        vals.forEach(el => {
          const target   = parseInt(el.dataset.target, 10);
          const duration = 1200;
          const start    = performance.now();
          function step(now) {
            const p    = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(ease * target);
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  const stats = document.getElementById('hero-stats');
  if (stats) observer.observe(stats);
})();

/* ── CONVICTION METER ANIMATION ── */
(function initMeter() {
  const fill = document.querySelector('.meter-fill');
  if (!fill) return;
  const finalWidth = fill.style.width;
  fill.style.width = '0%';

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => { fill.style.width = finalWidth; }, 300);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  observer.observe(fill.closest('.agent-card-coordinator'));
})();

/* ── MOUSE-PARALLAX on HERO HEX ── */
(function initParallax() {
  const hex = document.querySelector('.hero-hex-container');
  const orb = document.querySelector('.hero-glow');
  if (!hex) return;

  document.addEventListener('mousemove', e => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    hex.style.transform = `translate(calc(-50% + ${dx * 12}px), calc(-50% + ${dy * 12}px))`;
    if (orb) orb.style.transform = `translate(calc(-50% + ${dx * 5}px), calc(-50% + ${dy * 5}px))`;
  });
})();

/* ── SMOOTH ANCHOR LINKS ── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ── PART 2: LIVE STATS ── */
(function initLiveStats() {
  const BACKEND = window.__BACKEND_URL__ || 'http://localhost:3000';

  function animateNum(el, target, suffix = '') {
    const duration = 1500;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target; // ensure exact final value
    }
    requestAnimationFrame(step);
  }

  fetch(`${BACKEND}/api/stats`, { signal: AbortSignal.timeout(4000) })
    .then(r => r.json())
    .then(data => {
      // Hero stats bar
      const heroVals = document.querySelectorAll('.hstat-val[data-target]');
      if (heroVals[0]) animateNum(heroVals[0], data.agentCount);
      if (heroVals[1]) animateNum(heroVals[1], data.avgResponseMs);
      if (heroVals[2]) animateNum(heroVals[2], data.accuracyPercent);
      // Metrics section
      const metricVals = document.querySelectorAll('.count-up[data-target]');
      if (metricVals[0]) animateNum(metricVals[0], data.agentCount);
      if (metricVals[1]) animateNum(metricVals[1], data.avgResponseMs);
    })
    .catch(() => {
      // Fallback: run existing count-up with defaults (already seeded in HTML)
      console.info('[Stats] Backend offline — using static defaults.');
    });
})();

/* ── PART 3: ANALYZE TOKEN MODAL ── */
(function initAnalyzeModal() {
  const BACKEND = window.__BACKEND_URL__ || 'http://localhost:3000';
  const overlay    = document.getElementById('analyze-modal');
  const closeBtn   = document.getElementById('modal-close');
  const runBtn     = document.getElementById('modal-run-btn');
  const btnText    = document.getElementById('modal-btn-text');
  const spinner    = document.getElementById('modal-spinner');
  const input      = document.getElementById('token-address-input');
  const errorEl    = document.getElementById('modal-error');

  function openModal() {
    overlay.classList.add('open');
    setTimeout(() => input && input.focus(), 300);
  }
  function closeModal() {
    overlay.classList.remove('open');
    if (input) input.value = '';
    if (errorEl) errorEl.textContent = '';
    setLoading(false);
  }
  function setLoading(on) {
    runBtn.disabled = on;
    btnText.textContent = on ? 'Agents working...' : 'Run Analysis';
    spinner.classList.toggle('hidden', !on);
  }

  // Open via hero "Analyze a Token" button
  const heroPrimaryBtn = document.querySelector('.btn-hero-primary');
  if (heroPrimaryBtn) heroPrimaryBtn.addEventListener('click', e => { e.preventDefault(); openModal(); });

  // Open via CTA "Run Analysis" button
  const ctaBtn = document.getElementById('cta-btn');
  if (ctaBtn) ctaBtn.addEventListener('click', e => { e.preventDefault(); openModal(); });

  // Close
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Submission
  async function runAnalysis() {
    const address = input.value.trim();
    errorEl.textContent = '';
    if (!address) {
      errorEl.textContent = 'Please enter a token address.';
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/tokens/${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const result = await res.json();
      sessionStorage.setItem('lastTokenResult', JSON.stringify(result));
      window.location.href = `/app/token.html?address=${encodeURIComponent(address)}`;
    } catch (err) {
      errorEl.textContent = 'Could not find this token. Check the address and try again.';
      setLoading(false);
    }
  }

  if (runBtn) runBtn.addEventListener('click', runAnalysis);
  if (input)  input.addEventListener('keydown', e => { if (e.key === 'Enter') runAnalysis(); });
})();

/* ── PART 4: "How It Works →" button (already wired via href="#how") ── */
// The btn-hero-ghost href="#how" in the hero is handled by the smooth anchor scroll above.

/* ── PART 5: PIPELINE TAG → AGENT CARD SCROLL ── */
(function initPipelineTags() {
  const tagMap = {
    'Launch Scout': '#card-scout',
    'Multi-Agent':  '#agents',
    'Coordinator':  '#card-coordinator',
    'Execution':    '#agents',
  };
  document.querySelectorAll('.step-tag').forEach(tag => {
    const target = tagMap[tag.textContent.trim()];
    if (!target) return;
    tag.setAttribute('role', 'button');
    tag.setAttribute('tabindex', '0');
    tag.setAttribute('title', `Scroll to ${tag.textContent.trim()} section`);
    function scrollToTarget(e) {
      e.preventDefault();
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    tag.addEventListener('click', scrollToTarget);
    tag.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') scrollToTarget(e); });
  });
})();

/* ── PART 6: AGENT CARDS STATUS & DRAWER ── */
(function initAgentCards() {
  const BACKEND = window.__BACKEND_URL__ || 'http://localhost:3000';
  const overlay = document.getElementById('agent-drawer');
  const closeBtn = document.getElementById('drawer-close');
  
  const dIcon      = document.getElementById('drawer-icon');
  const dName      = document.getElementById('drawer-agent-name');
  const dFile      = document.getElementById('drawer-agent-file');
  const dStatus    = document.getElementById('drawer-status');
  const dAvgScore  = document.getElementById('drawer-avg-score');
  const dToday     = document.getElementById('drawer-runs-today');
  const dHistoryList = document.getElementById('drawer-history-list');

  // 1. Fetch Status and Update Badges
  function fetchStatus() {
    fetch(`${BACKEND}/api/agents/status`)
      .then(r => r.json())
      .then(agents => {
        agents.forEach(a => {
          const card = document.querySelector(`.agent-card[data-agent="${a.name}"]`);
          if (card) {
            const statusEl = card.querySelector('.agent-status');
            if (statusEl) {
              statusEl.textContent = a.status.toUpperCase();
              statusEl.className = `agent-status ${a.status.toLowerCase()}`;
            }
          }
        });
      })
      .catch(() => console.warn('[Agents] Failed to fetch live status. using defaults.'));
  }

  // 2. Click Handler to Open Drawer
  const agentMeta = {
    launchScout:      { title: 'Launch Scout', file: 'launchScout.js', iconHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M16.5 16.5l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
    momentumAnalyst:  { title: 'Momentum Analyst', file: 'momentumAnalyst.js', iconHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polyline points="3,17 9,11 13,15 21,7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15,7 21,7 21,13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    creatorChecker:  { title: 'Creator Checker', file: 'creatorChecker.js', iconHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
    feeAnalyst:       { title: 'Fee Analyst', file: 'feeAnalyst.js', iconHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v1.5m0 7V17M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5c0 2.5-5 2.5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
    riskManager:      { title: 'Risk Manager', file: 'riskManager.js', iconHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 8v5M12 16v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }
  };

  async function openDrawer(agentName) {
    const meta = agentMeta[agentName];
    if (!meta) return;

    // Reset view
    dIcon.innerHTML = meta.iconHtml;
    dName.textContent = meta.title;
    dFile.textContent = meta.file;
    dStatus.textContent = '-';
    dAvgScore.textContent = '-';
    dToday.textContent = '-';
    dHistoryList.innerHTML = '<div style="color:var(--grey-2);font-size:12px;">Loading history...</div>';

    overlay.classList.add('open');

    try {
      // 1. Fetch specific agent status
      const statusRes = await fetch(`${BACKEND}/api/agents/status`);
      const statuses = await statusRes.json();
      const curr = statuses.find(a => a.name === agentName);
      if (curr) {
        dStatus.textContent = curr.status.toUpperCase();
        dStatus.className = `dstat-val ${curr.status.toLowerCase()}`;
        dAvgScore.textContent = curr.avgScore !== null ? curr.avgScore : 'N/A';
        dToday.textContent = curr.runsToday;
      }

      // 2. Fetch History
      const historyRes = await fetch(`${BACKEND}/api/agents/${agentName}/history`);
      const history = await historyRes.json();

      if (history.length === 0) {
        dHistoryList.innerHTML = '<div style="color:var(--grey-2);font-size:12px;">No run records available yet.</div>';
      } else {
        dHistoryList.innerHTML = history.map(h => {
          const scoreClass = h.score >= 0.75 ? '' : h.score >= 0.4 ? 'warn' : 'danger';
          const scoreDisplay = h.score !== null ? h.score : 'N/A';
          const reasons = h.reasons.length 
            ? `<div class="ditem-reasons">${h.reasons.map(r => `<span>• ${r}</span>`).join('')}</div>`
            : '';
          const time = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          return `
            <div class="drawer-item">
              <div class="ditem-header">
                <span class="ditem-symbol">${h.tokenSymbol}</span>
                <span class="ditem-score ${scoreClass}">${scoreDisplay}</span>
              </div>
              <span class="ditem-addr">${h.tokenAddress}</span>
              ${reasons}
              <div class="ditem-time">${time}</div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      dHistoryList.innerHTML = '<div style="color:#ff4444;font-size:12px;">Failed to load details.</div>';
    }
  }

  function closeDrawer() {
    overlay.classList.remove('open');
  }

  // Wire events
  document.querySelectorAll('.agent-card[data-agent]').forEach(card => {
    card.addEventListener('click', () => {
      const agent = card.getAttribute('data-agent');
      openDrawer(agent);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // Init
  setTimeout(fetchStatus, 500); // give backend a sec to settle
})();

/* ── PART 10: CTA "Run Analysis" button → opens analyze modal ── */
(function initCtaRunBtn() {
  const ctaRunBtn = document.getElementById('cta-run-btn');
  if (!ctaRunBtn) return;
  ctaRunBtn.addEventListener('click', e => {
    e.preventDefault();
    const modal = document.getElementById('analyze-modal');
    const input = document.getElementById('token-address-input');
    if (modal) {
      modal.classList.add('open');
      setTimeout(() => input?.focus(), 50);
    }
  });
})();

/* ── PART 12: API snippet click-to-copy ── */
(function initSnippetCopy() {
  const snippet = document.getElementById('cta-snippet');
  const copiedEl = document.getElementById('snippet-copied');
  if (!snippet || !copiedEl) return;

  let copyTimer;
  function doCopy() {
    const code = snippet.querySelector('code');
    const text = code?.dataset?.copy || code?.textContent?.trim() || 'GET /api/tokens/{mintAddress}';
    navigator.clipboard.writeText(text).then(() => {
      copiedEl.classList.add('show');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => copiedEl.classList.remove('show'), 2000);
    }).catch(() => {});
  }

  snippet.addEventListener('click', doCopy);
  snippet.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); } });
})();


