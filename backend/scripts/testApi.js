/**
 * testApi.js — Phase 4 test
 * Boots server, hits the /latest endpoint to verify Express wiring, then exits.
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

const SEPARATOR = '\n' + '═'.repeat(60) + '\n';

async function runTest() {
  console.log(SEPARATOR);
  console.log('🤖 CONVICTION — Phase 4 API Tests');
  console.log(SEPARATOR);

  // Start the server
  const server = spawn('node', ['server.js'], { cwd: process.cwd() });
  
  server.stdout.on('data', (data) => process.stdout.write(`[Server] ${data}`));
  server.stderr.on('data', (data) => process.stderr.write(`[Server] ${data}`));

  // Wait for server to boot
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n[Tester] Calling GET /api/tokens/latest?limit=1 ...');
  try {
    const res = await fetch('http://localhost:4000/api/tokens/latest?limit=1');
    const data = await res.json();
    
    console.log('[Tester] Response Status:', res.status);
    console.log('[Tester] Output:', JSON.stringify(data, null, 2));

    console.log('\n[Tester] Calling GET /api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/quote ...');
    const quoteRes = await fetch('http://localhost:4000/api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/quote?amount=0.01');
    const quoteData = await quoteRes.json();
    console.log('[Tester] Quote Status:', quoteRes.status);
    console.log('[Tester] Output:', JSON.stringify(quoteData, null, 2));

    console.log(SEPARATOR);
    console.log('✅ Phase 4 Testing Complete.');
  } catch (err) {
    console.error('[Tester] Error:', err.message);
  } finally {
    console.log('[Tester] Shutting down server...');
    server.kill();
    process.exit(0);
  }
}

runTest();
