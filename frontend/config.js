/**
 * CONVICTION — Frontend Config
 * Single place to configure backend URL.
 * In production, set window.__BACKEND_URL__ before this script loads,
 * or this auto-detects: same origin in prod, localhost:3000 in dev.
 */
(function() {
  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  window.__BACKEND_URL__ = window.__BACKEND_URL__
    || (isDev ? 'http://localhost:3000' : '');  // empty = same origin in prod
  window.__PRIVY_APP_ID__ = window.__PRIVY_APP_ID__ || '';
})();
