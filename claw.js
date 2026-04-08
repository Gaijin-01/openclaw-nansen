#!/usr/bin/env node
/**
 * OpenClaw 🦞 — Nansen CLI Wrapper
 * Agentic on-chain intelligence via Nansen CLI
 * 
 * Usage:
 *   node claw.js profile <address> [--chain ethereum|solana|base]
 *   node claw.js monitor --chain <chain> --minutes <N>
 *   node claw.js research "<question>"
 *   node claw.js demo      ← runs 15+ API calls, generates report
 *   node claw.js report    ← generate HTML report from last demo
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = join(__dirname, 'report.html');
const DATA_PATH = join(__dirname, '.last_run.json');

// ── Chalk-y console helpers ─────────────────────────────────────────────────

const dim = (t) => console.log(`\x1b[2m${t}\x1b[0m`);
const bold = (t) => console.log(`\x1b[1m${t}\x1b[0m`);
const ok = (t) => console.log(`\x1b[32m✓\x1b[0m  ${t}`);
const err = (t) => console.error(`\x1b[31m✗\x1b[0m  ${t}`);
const info = (t) => console.log(`\x1b[36m➜\x1b[0m  ${t}`);
const header = (t) => console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'─'.repeat(60)}`);

// ── Nansen CLI spawner ──────────────────────────────────────────────────────

/**
 * Run a nansen command, return stdout as string (or parsed JSON if --json)
 * @param {string[]} args  e.g. ['research', 'smart-money', 'netflow', '--chain', 'solana']
 * @param {{ json?: boolean, fail?: boolean }} opts
 */
async function nansen(args, opts = {}) {
  const { json = false, fail = true } = opts;
  const allArgs = json ? [...args, '--format', 'json'] : args;
  
  return new Promise((resolve, reject) => {
    const proc = spawn('nansen', allArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0 && fail) {
        const msg = stderr || stdout || `nansen exited code ${code}`;
        // Skip "not logged in" errors in demo mode
        if (msg.includes('UNAUTHORIZED') || msg.includes('Not logged in')) {
          resolve({ _error: 'AUTH_REQUIRED', message: 'API key required. Run: nansen login --api-key <KEY>' });
          return;
        }
        reject(new Error(msg.slice(0, 200)));
        return;
      }
      resolve(stdout.trim());
    });

    proc.on('error', (e) => reject(e));
  });
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdProfile(address, chain = 'ethereum') {
  header(`Wallet Profile: ${address.slice(0, 10)}... [${chain}]`);
  
  const results = {};
  
  try {
    const [labels, balance, pnl, txCount] = await Promise.all([
      nansen(['research', 'profiler', 'labels', '--address', address, '--chain', chain], { fail: false }),
      nansen(['research', 'profiler', 'balance', '--address', address, '--chain', chain], { fail: false }),
      nansen(['research', 'profiler', 'pnl-summary', '--address', address, '--chain', chain], { fail: false }),
      nansen(['research', 'profiler', 'transactions', '--address', address, '--chain', chain, '--limit', '5'], { fail: false }),
    ]);

    results.labels = labels;
    results.balance = balance;
    results.pnl = pnl;
    results.txCount = txCount;

    try {
      const labelsData = JSON.parse(labels);
      if (labelsData.labels) {
        ok(`Labels: ${labelsData.labels.map(l => l.label || l).join(', ')}`);
      } else if (labelsData.smart_labels) {
        ok(`Smart Labels: ${labelsData.smart_labels.join(', ')}`);
      }
    } catch { /* non-JSON or empty */ }

    try {
      const balData = JSON.parse(balance);
      if (balData.holdings) {
        ok(`Top holdings: ${balData.holdings.slice(0, 3).map(h => h.symbol || h.token || '?').join(', ')}`);
      }
    } catch { /* non-JSON or empty */ }

    try {
      const pnlData = JSON.parse(pnl);
      if (pnlData.total_pnl || pnlData.pnl) {
        ok(`PnL: ${pnlData.total_pnl || pnlData.pnl}`);
      }
    } catch { /* non-JSON or empty */ }

  } catch (e) {
    err(`Profile error: ${e.message}`);
  }

  return results;
}

async function cmdMonitor(chain = 'solana', minutes = 30) {
  header(`Smart Money Monitor: ${chain} — ${minutes}min loop`);
  
  const calls = [];
  const wallets = [
    { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'Vitalik', chain: 'ethereum' },
    { addr: '0x28C6c06298d514Db089934071355E5743bf21d60', name: 'Binance Relayer', chain: 'ethereum' },
    { addr: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4', name: 'Solana whale', chain: 'solana' },
  ];

  info(`Running ${wallets.length} wallet profiles + netflow + token screener...`);

  const flow = await nansen(['research', 'smart-money', 'netflow', '--chain', chain]);
  const dexTrades = await nansen(['research', 'smart-money', 'dex-trades', '--chain', chain], { fail: false });
  const screener = await nansen(['research', 'token', 'screener', '--chain', chain, '--limit', '10']);

  calls.push({ cmd: 'smart-money netflow', data: flow });
  calls.push({ cmd: 'smart-money dex-trades', data: dexTrades });
  calls.push({ cmd: 'token screener', data: screener });

  for (const w of wallets) {
    if (w.chain !== chain) continue;
    try {
      const r = await nansen(['research', 'profiler', 'labels', '--address', w.addr, '--chain', w.chain], { fail: false });
      calls.push({ cmd: `profiler labels ${w.name}`, data: r });
      ok(`${w.name}: done`);
    } catch (e) {
      err(`${w.name}: ${e.message.slice(0, 80)}`);
    }
  }

  saveRun({ chain, minutes, calls, timestamp: new Date().toISOString() });
  await generateReport({ chain, minutes, calls });

  return calls;
}

async function cmdResearch(question, expert = false) {
  header(`Nansen Agent: "${question}"`);
  
  const mode = expert ? '--expert' : '';
  const output = await nansen(['agent', question, ...(expert ? ['--expert'] : [])]);
  
  console.log(output);
  return output;
}

async function cmdDemo() {
  header('OpenClaw 🦞 Nansen CLI — Demo Loop (15+ API calls)');
  bold('   Agentic intelligence that spreads out.\n');

  const results = [];
  const wallets = [
    { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'Vitalik.eth', chain: 'ethereum' },
    { addr: '0x28C6c06298d514Db089934071355E5743bf21d60', name: 'Binance Wallet', chain: 'ethereum' },
    { addr: 'CZJGhFWw7FTupW9nkU7ph9FngKk7RXMGYs', name: 'Solana Whale', chain: 'solana' },
  ];

  const chains = ['ethereum', 'solana', 'base'];
  let callCount = 0;

  for (const chain of chains) {
    info(`\n▶ Chain: ${chain.toUpperCase()}`);
    try {
      const netflow = await nansen(['research', 'smart-money', 'netflow', '--chain', chain]);
      results.push({ call: callCount++, cmd: `smart-money netflow [${chain}]`, data: netflow, ok: true });
      ok(`netflow [${chain}]`);
    } catch (e) {
      results.push({ call: callCount++, cmd: `smart-money netflow [${chain}]`, error: e.message, ok: false });
      err(`netflow [${chain}]: ${e.message.slice(0, 60)}`);
    }

    try {
      const holdings = await nansen(['research', 'smart-money', 'holdings', '--chain', chain, '--limit', '5'], { fail: false });
      results.push({ call: callCount++, cmd: `smart-money holdings [${chain}]`, data: holdings, ok: true });
      ok(`holdings [${chain}]`);
    } catch (e) {
      err(`holdings [${chain}]: ${e.message.slice(0, 60)}`);
    }
  }

  for (const w of wallets) {
    info(`\n▶ Wallet: ${w.name} (${w.chain})`);
    for (const endpoint of ['labels', 'balance', 'transactions']) {
      try {
        const r = await nansen([
          'research', 'profiler', endpoint,
          '--address', w.addr,
          '--chain', w.chain,
          '--limit', '3',
        ], { fail: false });
        results.push({ call: callCount++, cmd: `profiler ${endpoint} [${w.name}]`, data: r, ok: true });
        ok(`${endpoint} [${w.name}]`);
      } catch (e) {
        results.push({ call: callCount++, cmd: `profiler ${endpoint} [${w.name}]`, error: e.message, ok: false });
        err(`${endpoint}: ${e.message.slice(0, 60)}`);
      }
    }
  }

  // Token screener on Solana
  try {
    const screener = await nansen(['research', 'token', 'screener', '--chain', 'solana', '--limit', '10']);
    results.push({ call: callCount++, cmd: 'token screener [solana]', data: screener, ok: true });
    ok('token screener [solana]');
  } catch (e) {
    err(`token screener: ${e.message.slice(0, 60)}`);
  }

  // Agent query
  try {
    const agentR = await nansen(['agent', 'What are the top Smart Money inflows on Solana right now?']);
    results.push({ call: callCount++, cmd: 'nansen agent (fast)', data: agentR, ok: true });
    ok('nansen agent (fast)');
  } catch (e) {
    err(`agent: ${e.message.slice(0, 60)}`);
  }

  const successful = results.filter(r => r.ok).length;
  const authRequired = results.filter(r => r.error?.includes('AUTH') || r.error?.includes('Insufficient credits')).length;
  const walletsProfiled = new Set(results.filter(r => r.cmd?.includes('profiler labels')).map(r => r.cmd)).size;

  // Extract key signals from raw data
  const keySignals = [];
  for (const r of results) {
    if (r.data && typeof r.data === 'string') {
      try {
        const parsed = JSON.parse(r.data);
        // Look for smart money labels
        const labels = parsed.labels || parsed.smart_labels || parsed.smartLabels || [];
        if (labels.length > 0) {
          const signal = labels.slice(0, 2).map(l => l.label || l.name || l).join(', ');
          if (signal && signal !== 'unknown') keySignals.push(signal);
        }
        // Look for netflow data
        if (parsed.netflow || parsed.flow || parsed.capital_flows) {
          const flow = parsed.netflow || parsed.flow || parsed.capital_flows;
          if (flow && flow !== 0) keySignals.push(`Netflow: ${flow > 0 ? '+' : ''}${flow}`);
        }
      } catch { /* not JSON */ }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  bold(`\nDemo complete: ${callCount} calls attempted, ${successful} returned data`);
  if (authRequired > 0) {
    dim(`(${authRequired} calls need API credits — upgrade for Smart Money / agent access)`);
  }

  // JSON summary (machine-readable, challenge requirement)
  const summary = {
    walletsProfiled,
    keySignals: keySignals.slice(0, 5),
    nansenCallsMade: callCount,
    successful,
    timestamp: new Date().toISOString(),
  };
  console.log('\n📦 JSON Summary:');
  console.log(JSON.stringify(summary, null, 2));

  saveRun({ results, timestamp: new Date().toISOString(), totalCalls: callCount, successful, ...summary });
  await generateReport({ results, totalCalls: callCount, successful, authRequired, walletsProfiled, keySignals: summary.keySignals });

  return summary;
}

async function cmdReport() {
  if (!existsSync(DATA_PATH)) {
    err('No data. Run `node claw.js demo` first.');
    return;
  }
  const data = JSON.parse(readFileSync(DATA_PATH));
  await generateReport(data);
  ok(`Report: ${REPORT_PATH}`);
}

// ── Persistence ─────────────────────────────────────────────────────────────

function saveRun(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  dim(`Data saved: ${DATA_PATH}`);
}

// ── HTML Report Generator ─────────────────────────────────────────────────────

async function generateReport(data) {
  const { results = [], totalCalls = 0, successful = 0, authRequired = 0, chain, minutes, calls = [] } = data;
  const timestamp = data.timestamp || new Date().toISOString();

  const allCalls = results.length ? results : calls;

  const rows = allCalls.map(c => {
    const status = c.error ? '🔒 AUTH' : (c.ok !== false ? '✅' : '❌');
    const shortData = c.data
      ? (c.data._error 
          ? c.data.message 
          : truncate(JSON.stringify(c.data), 120))
      : (c.error || '—');
    return `    <tr>
      <td>${status}</td>
      <td><code>${c.cmd || c.call || '?'}</code></td>
      <td><pre>${escapeHtml(truncate(shortData, 150))}</pre></td>
    </tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenClaw 🦞 — Nansen Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; color: #e0e0e0; font-family: 'Courier New', monospace; min-height: 100vh; padding: 2rem; }
  .container { max-width: 1100px; margin: 0 auto; }
  h1 { color: #ff6b35; font-size: 2rem; margin-bottom: 0.25rem; }
  .subtitle { color: #888; font-size: 0.85rem; margin-bottom: 2rem; }
  .badge-row { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .badge { background: #1a1a2e; border: 1px solid #333; padding: 0.5rem 1rem; border-radius: 6px; }
  .badge .val { color: #ff6b35; font-size: 1.4rem; font-weight: bold; }
  .badge .lbl { color: #666; font-size: 0.7rem; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
  th { background: #1a1a2e; color: #ff6b35; padding: 0.6rem 0.8rem; text-align: left; border-bottom: 2px solid #333; }
  td { padding: 0.5rem 0.8rem; border-bottom: 1px solid #1a1a2e; vertical-align: top; }
  tr:hover td { background: #111118; }
  pre { white-space: pre-wrap; word-break: break-all; color: #aaa; font-size: 0.7rem; line-height: 1.4; max-height: 80px; overflow: hidden; }
  code { color: #4fc3f7; }
  .✅ { color: #4caf50; } .❌ { color: #f44336; } .🔒 { color: #ff9800; }
  .footer { margin-top: 3rem; color: #444; font-size: 0.7rem; text-align: center; }
  .cmd { color: #81d4fa; }
</style>
</head>
<body>
<div class="container">
  <h1>🦞 OpenClaw — Nansen Report</h1>
  <p class="subtitle">Generated ${new Date(timestamp).toUTCString()} · #NansenCLI Challenge</p>
  
  <div class="badge-row">
    <div class="badge"><div class="val">${totalCalls || allCalls.length}</div><div class="lbl">Total Calls</div></div>
    <div class="badge"><div class="val">${successful || allCalls.filter(c => c.ok !== false).length}</div><div class="lbl">Successful</div></div>
    <div class="badge"><div class="val">${authRequired || 0}</div><div class="lbl">Need API Key</div></div>
    ${chain ? `<div class="badge"><div class="val">${chain}</div><div class="lbl">Chain</div></div>` : ''}
    ${minutes ? `<div class="badge"><div class="val">${minutes}m</div><div class="lbl">Monitor Window</div></div>` : ''}
  </div>

  <table>
    <thead><tr><th>Status</th><th>Command</th><th>Output (truncated)</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <div class="footer">
    OpenClaw 🦞 — Agentic intelligence that spreads out · Built with nansen-cli · #NansenCLI
  </div>
</div>
</body>
</html>`;

  writeFileSync(REPORT_PATH, html);
  console.log(`\n📊 Report written: ${REPORT_PATH}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s, n) {
  if (!s || typeof s !== 'string') return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── CLI dispatcher ───────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

const commands = {
  profile:  async () => {
    const address = args[0];
    if (!address) { err('Usage: claw.js profile <address> [--chain ethereum]'); process.exit(1); }
    const chainIdx = args.indexOf('--chain');
    const chain = chainIdx >= 0 ? args[chainIdx + 1] : 'ethereum';
    await cmdProfile(address, chain);
  },
  monitor:  async () => {
    const chainIdx = args.indexOf('--chain');
    const minIdx = args.indexOf('--minutes');
    const chain = chainIdx >= 0 ? args[chainIdx + 1] : 'solana';
    const minutes = minIdx >= 0 ? parseInt(args[minIdx + 1]) : 30;
    await cmdMonitor(chain, minutes);
  },
  research: async () => {
    const question = args.join(' ');
    const expert = args.includes('--expert');
    await cmdResearch(question, expert);
  },
  demo:     cmdDemo,
  report:   cmdReport,
  help:     () => {
    console.log(`OpenClaw 🦞 Nansen CLI — Commands:
  claw.js demo                  Run full demo (15+ API calls + HTML report)
  claw.js profile <addr>        Wallet profile (--chain ethereum|solana|base)
  claw.js monitor --chain solana --minutes 30   Smart Money flow monitor
  claw.js research "<question>" Ask Nansen AI agent (--expert for deep)
  claw.js report                Re-generate HTML report from last run
  claw.js --help               This help`);
  },
};

(async () => {
  const fn = commands[cmd] || commands.help;
  await fn();
})().catch((e) => {
  err(e.message);
  process.exit(1);
});
