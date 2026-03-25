/**
 * agentHistory.js
 * Central in-memory store for per-agent run history and status.
 * Each agent module imports this and records every run.
 */

// Shape: { agentName -> { status, lastRunAt, runs: [...last 10] } }
const store = {};

const AGENT_NAMES = ['launchScout', 'momentumAnalyst', 'creatorChecker', 'feeAnalyst', 'riskManager'];

// Initialise all agents to idle
for (const name of AGENT_NAMES) {
  store[name] = { status: 'idle', lastRunAt: null, runs: [] };
}

/**
 * Record a completed agent run.
 * @param {string} agentName
 * @param {object} result  - full agent output
 * @param {'active'|'error'} status
 */
export function recordRun(agentName, result, status = 'active') {
  if (!store[agentName]) store[agentName] = { status: 'idle', lastRunAt: null, runs: [] };
  const entry = {
    tokenAddress:  result.tokenAddress  || null,
    tokenSymbol:   result.tokenSymbol   || 'UNKNOWN',
    score:         result.score         ?? null,
    confidence:    result.confidence    ?? null,
    flag:          result.flag          || null,
    reasons:       result.reasons       || [],
    timestamp:     new Date().toISOString(),
  };
  store[agentName].runs.unshift(entry);
  if (store[agentName].runs.length > 10) store[agentName].runs.pop();
  store[agentName].status    = status;
  store[agentName].lastRunAt = entry.timestamp;
}

/**
 * Get status summary for all agents.
 */
export function getAllStatus() {
  return AGENT_NAMES.map(name => {
    const s = store[name];
    const scores = s.runs.map(r => r.score).filter(v => v !== null);
    const avgScore = scores.length
      ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3))
      : null;
    // Count runs in last 24h
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const runsToday = s.runs.filter(r => new Date(r.timestamp).getTime() > dayAgo).length;
    return {
      name,
      status:    s.status,
      lastRunAt: s.lastRunAt,
      avgScore,
      runsToday,
    };
  });
}

/**
 * Get last 10 runs for a specific agent.
 */
export function getHistory(agentName) {
  return store[agentName]?.runs || [];
}
