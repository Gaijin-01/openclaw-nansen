#!/usr/bin/env node
/**
 * OpenClaw 🦞 — Nansen CLI Wrapper
 * Agentic on-chain intelligence via Nansen CLI
 * 
 * Usage:
 *   claw demo              — 15 API calls + HTML report  
 *   claw profile <addr>   — wallet profile (labels, balance, PnL, tx)
 *   claw monitor <chain>  — Smart Money flow loop (30min)
 *   claw research "<q>"   — ask Nansen AI agent
 *   claw report           — regenerate HTML from last run
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = join(__dirname, 'report.html');
const DATA_PATH   = join(__dirname, '.last_run.json');

// ── Console helpers ─────────────────────────────────────────────────────────

const dim   = t => console.log(`\x1b[2m${t}\x1b[0m`);
const bold  = t => console.log(`\x1b[1m${t}\x1b[0m`);
const ok    = t => console.log(`\x1b[32m✓\x1b[0m  ${t}`);
const warn  = t => console.log(`\x1b[33m⚠\x1b[0m  ${t}`);
const err   = t => console.error(`\x1b[31m✗\x1b[0m  ${t}`);
const info  = t => console.log(`\x1b[36m➜\x1b[0m  ${t}`);
const header= t => console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'─'.repeat(60)}`);

const spinner = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧'][Math.floor(Date.now()/80)%8];

// ── Nansen CLI spawner ──────────────────────────────────────────────────────

function isError(data) {
  if (!data || typeof data !== 'string') return false;
  try {
    const d = JSON.parse(data.trim());
    return d.success === false || d.error || d.code;
  } catch { return false; }
}

async function nansen(args, opts = {}) {
  const { fail = true } = opts;
  return new Promise((resolve, reject) => {
    const proc = spawn('nansen', args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      if (code === 0 && !isError(stdout)) { resolve(stdout.trim()); return; }
      if (code === 0 && isError(stdout)) {
        const e = extractError(stdout);
        if (e.includes('Insufficient credits') || e.includes('No API key')) {
          resolve(null); // soft fail — null means "needs credits"
          return;
        }
      }
      const msg = stderr || stdout || `nansen exit ${code}`;
      if (fail) reject(new Error(msg.slice(0, 200)));
      else resolve(null);
    });
    proc.on('error', e => fail ? reject(e) : resolve(null));
  });
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdProfile(address, chain = 'ethereum') {
  header(`Wallet Profile: ${address.slice(0,10)}... [${chain}]`);
  const r = {};
  const fields = [
    { f: 'labels',        label: 'Labels'        },
    { f: 'balance',       label: 'Balance'       },
    { f: 'pnl-summary',   label: 'PnL Summary'   },
    { f: 'transactions',  label: 'Tx (last 5)'  },
  ];
  for (const { f, label } of fields) {
    process.stdout.write(`\r${spinner} ${label}...`);
    const out = await nansen(['research','profiler',f,'--address',address,'--chain',chain,'--limit','5'],{fail:false});
    process.stdout.write('\r');
    if (!out) { warn(`${label}: needs credits`); r[f] = null; continue; }
    try {
      const d = JSON.parse(out);
      if (d.labels)        { ok(`Labels: ${d.labels.slice(0,3).map(l=>l.label||l).join(', ')}`); r[f]=d.labels; }
      else if (d.holdings) { ok(`Top: ${d.holdings.slice(0,3).map(h=>h.symbol||'?').join(', ')}`); r[f]=d.holdings; }
      else if (d.total_pnl !== undefined) { ok(`PnL: $${d.total_pnl}`); r[f]=d; }
      else if (d.transactions) { ok(`Tx count: ${d.transactions?.length || 0}`); r[f]=d.transactions; }
      else { ok(label); r[f] = d; }
    } catch { ok(label); r[f] = out; }
  }
  return r;
}

async function cmdMonitor(chain = 'solana', minutes = 30) {
  header(`Smart Money Monitor: ${chain} — ${minutes}min loop`);
  const intervals = Math.floor(minutes / 2);
  for (let i = 0; i < intervals; i++) {
    info(`Round ${i+1}/${intervals}`);
    const [nf, dex] = await Promise.all([
      nansen(['research','smart-money','netflow','--chain',chain],{fail:false}),
      nansen(['research','smart-money','dex-trades','--chain',chain,'--limit','10'],{fail:false}),
    ]);
    if (nf) {
      const d = JSON.parse(nf);
      const flow = d.netflow ?? d.flow ?? d.capital_flows ?? '?';
      const sign = flow > 0 ? '🟢' : '🔴';
      ok(`${sign} Netflow: ${flow}`);
    } else { warn('netflow: needs credits'); }
    if (dex) { ok('DEX trades: fetched'); } // truncated for display
    await new Promise(r => setTimeout(r, 120000)); // 2min between rounds
  }
  return { chain, minutes };
}

async function cmdResearch(question, expert = false) {
  header(`Nansen Agent: "${question}"`);
  process.stdout.write(`\r${spinner} Querying...`);
  const mode = expert ? '--expert' : '';
  const out = await nansen(['agent', question, ...(expert?['--expert']:[])]);
  process.stdout.write('\r');
  if (!out) { warn('Agent needs credits or API key'); return; }
  console.log(out);
  return out;
}

async function cmdDemo() {
  header('OpenClaw 🦞 — Nansen CLI Demo (15 calls)');
  bold('   agentic intelligence that spreads out.\n');

  const results = [];
  let callCount = 0;

  const wallets = [
    { addr:'0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name:'Vitalik.eth',   chain:'ethereum' },
    { addr:'0x28C6c06298d514Db089934071355E5743bf21d60', name:'Binance Wallet',chain:'ethereum' },
    { addr:'CZJGhFWw7FTupW9nkU7ph9FngKk7RXMGYs',          name:'Solana Whale',  chain:'solana'   },
  ];

  const chains = ['ethereum','solana','base'];

  // Smart Money flows (3 chains × 2 = 6 calls)
  for (const chain of chains) {
    for (const cmd of ['netflow','holdings']) {
      callCount++;
      process.stdout.write(`\r${spinner} ${chain}/${cmd}...`);
      const out = await nansen(['research','smart-money',cmd,'--chain',chain,'--limit','5'],{fail:false});
      process.stdout.write('\r');
      const ok_flag = out && !isError(out);
      results.push({ call: callCount, chain, cmd:`smart-money ${cmd}`, out, ok: ok_flag });
      ok_flag ? ok(`${chain}/${cmd}`) : warn(`${chain}/${cmd}: needs credits`);
    }
  }

  // Wallet profiling (3 wallets × 4 fields = 12 calls)
  for (const w of wallets) {
    for (const field of ['labels','balance','transactions','pnl-summary']) {
      callCount++;
      process.stdout.write(`\r${spinner} ${w.name}/${field}...`);
      const out = await nansen([
        'research','profiler',field,
        '--address',w.addr,
        '--chain',w.chain,
        '--limit','3',
      ],{fail:false});
      process.stdout.write('\r');
      const ok_flag = out && !isError(out);
      results.push({ call: callCount, wallet:w.name, chain:w.chain, cmd:`profiler ${field}`, out, ok: ok_flag });
      ok_flag ? ok(`${w.name}/${field}`) : warn(`${w.name}/${field}: needs credits`);
    }
  }

  // Token screener (1 call)
  callCount++;
  process.stdout.write(`\r${spinner} token screener [solana]...`);
  const screener = await nansen(['research','token','screener','--chain','solana','--limit','5'],{fail:false});
  process.stdout.write('\r');
  const s_ok = screener && !isError(screener);
  results.push({ call:callCount, cmd:'token screener [solana]', out:screener, ok:s_ok });
  s_ok ? ok('token screener [solana]') : warn('token screener: needs credits');

  // Agent (1 call)
  callCount++;
  process.stdout.write(`\r${spinner} nansen agent...`);
  const agent = await nansen(['agent','Top Smart Money inflows on Solana?']);
  process.stdout.write('\r');
  const a_ok = agent && !isError(agent);
  results.push({ call:callCount, cmd:'nansen agent', out:agent, ok:a_ok });
  a_ok ? ok('nansen agent') : warn('agent: needs credits');

  // ── Summary ──────────────────────────────────────────────────────────────
  const successful = results.filter(r=>r.ok).length;
  const credits_needed = results.filter(r=>!r.ok).length;

  console.log(`\n${'─'.repeat(60)}`);
  bold(`\n${successful}/${callCount} calls returned data`);
  if (credits_needed > 0) dim(`(${credits_needed} calls need Nansen credits — visit app.nansen.ai/billing)`);

  // Extract key signals
  const signals = [];
  for (const r of results) {
    if (!r.out || r.ok) continue;
    try {
      const d = JSON.parse(r.out);
      // Smart labels
      const lbls = d.labels || d.smart_labels || d.smartLabels || [];
      lbls.slice(0,2).forEach(l => {
        const s = typeof l === 'string' ? l : (l.label || l.name || '');
        if (s && !signals.includes(s)) signals.push(s);
      });
      // Netflow
      if (d.netflow || d.flow || d.capital_flows) {
        signals.push(`flow:${d.netflow ?? d.flow ?? d.capital_flows}`);
      }
    } catch {}
  }

  const summary = {
    walletsProfiled: new Set(results.filter(r=>r.cmd.startsWith('profiler labels')).map(r=>r.wallet)).size,
    keySignals: signals.slice(0,5),
    nansenCallsMade: callCount,
    successful,
    timestamp: new Date().toISOString(),
  };

  console.log('\n📦 JSON Summary:');
  console.log(JSON.stringify(summary, null, 2));

  saveRun({ results, ...summary });
  await generateReport({ results, ...summary });
  return summary;
}

async function cmdReport() {
  if (!existsSync(DATA_PATH)) { err('Run `claw demo` first.'); return; }
  const data = JSON.parse(readFileSync(DATA_PATH));
  await generateReport(data);
  ok(`Report: ${REPORT_PATH}`);
}

// ── Persistence ─────────────────────────────────────────────────────────────

function saveRun(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  dim(`Saved: ${DATA_PATH}`);
}

// ── HTML Report ─────────────────────────────────────────────────────────────

async function generateReport(data) {
  const { results=[], walletsProfiled=0, keySignals=[], nansenCallsMade=0, successful=0, timestamp='' } = data;

  const statusIcon = r => {
    if (!r.out && !r.ok) return '🔒';
    return r.ok ? '✅' : '❌';
  };
  const statusClass = r => {
    if (!r.out && !r.ok) return 'locked';
    return r.ok ? 'ok' : 'err';
  };

  const rows = results.map(r => {
    const icon = statusIcon(r);
    const cls  = statusClass(r);
    let preview = '';
    if (r.out && r.ok) {
      try {
        const d = JSON.parse(r.out);
        if (d.labels) preview = d.labels.slice(0,2).map(l=>l.label||l).join(', ');
        else if (d.holdings) preview = d.holdings.slice(0,2).map(h=>h.symbol||h.token||'?').join(', ');
        else if (d.netflow !== undefined) preview = `netflow: ${d.netflow}`;
        else if (d.transactions) preview = `${d.transactions.length} tx`;
        else preview = truncate(JSON.stringify(d).slice(0,200), 120);
      } catch { preview = truncate(String(r.out), 120); }
    } else if (!r.out) {
      preview = 'Needs Nansen credits';
    } else {
      preview = truncate(extractError(r.out), 120);
    }
    return `    <tr class="${cls}">
      <td class="icon">${icon}</td>
      <td><code>${r.cmd}</code></td>
      <td><pre>${escapeHtml(preview)}</pre></td>
    </tr>`;
  }).join('\n');

  const signalsHtml = keySignals.length
    ? keySignals.map(s => `<span class="signal">${escapeHtml(s)}</span>`).join('\n')
    : '<span class="dim">No signals extracted (needs credits)</span>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenClaw 🦞 — Nansen Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a0f;color:#e0e0e0;font-family:'Courier New',monospace;min-height:100vh;padding:2rem}
  .container{max-width:1100px;margin:0 auto}
  h1{color:#ff6b35;font-size:2rem;margin-bottom:.25rem}
  .subtitle{color:#666;font-size:.8rem;margin-bottom:2rem}
  .badge-row{display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
  .badge{background:#12121a;border:1px solid #2a2a3a;padding:.6rem 1.2rem;border-radius:8px}
  .badge .val{color:#ff6b35;font-size:1.6rem;font-weight:bold}
  .badge .lbl{color:#666;font-size:.65rem;text-transform:uppercase;letter-spacing:.05em}
  .signals{margin:1.5rem 0;padding:1rem 1.2rem;background:#12121a;border:1px solid #2a2a3a;border-radius:8px}
  .signals .lbl{color:#888;font-size:.7rem;text-transform:uppercase;margin-bottom:.6rem}
  .signal{background:#1e2a1e;border:1px solid #3a5a3a;color:#6f9f6f;padding:.2rem .6rem;border-radius:4px;margin:.2rem;display:inline-block;font-size:.75rem}
  .dim{color:#555}
  table{width:100%;border-collapse:collapse;font-size:.78rem;margin-top:1.5rem}
  th{background:#12121a;color:#ff6b35;padding:.7rem 1rem;text-align:left;border-bottom:2px solid #2a2a3a}
  td{padding:.6rem 1rem;border-bottom:1px solid #151520;vertical-align:top}
  tr:hover td{background:#0f0f18}
  tr.locked td{opacity:.5}
  pre{white-space:pre-wrap;word-break:break-all;color:#aaa;font-size:.72rem;line-height:1.5;max-height:60px;overflow:hidden;margin:0}
  code{color:#4fc3f7;font-size:.78rem}
  .icon{width:2rem;text-align:center;font-size:1rem}
  .ok pre{color:#8fbf8f}
  .err pre{color:#bf6f6f}
  .locked pre{color:#ff9800}
  .footer{margin-top:3rem;color:#333;font-size:.7rem;text-align:center}
  .nansen-link{color:#ff6b35;text-decoration:none}
</style>
</head>
<body>
<div class="container">
  <h1>🦞 OpenClaw — Nansen Report</h1>
  <p class="subtitle">Generated ${new Date(timestamp).toUTCString()} · <a class="nansen-link" href="https://github.com/Gaijin-01/openclaw-nansen">#NansenCLI</a></p>

  <div class="badge-row">
    <div class="badge"><div class="val">${nansenCallsMade}</div><div class="lbl">API Calls</div></div>
    <div class="badge"><div class="val">${successful}</div><div class="lbl">With Data</div></div>
    <div class="badge"><div class="val">${nansenCallsMade - successful}</div><div class="lbl">Need Credits</div></div>
    <div class="badge"><div class="val">${walletsProfiled}</div><div class="lbl">Wallets</div></div>
  </div>

  <div class="signals">
    <div class="lbl">🔍 Key Signals</div>
    ${signalsHtml}
  </div>

  <table>
    <thead><tr><th></th><th>Command</th><th>Output</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <div class="footer">
    OpenClaw 🦞 · agentic intelligence that spreads out · Built with <a class="nansen-link" href="https://docs.nansen.ai/cli">nansen-cli</a> · <a class="nansen-link" href="https://github.com/Gaijin-01/openclaw-nansen">GitHub</a>
  </div>
</div>
</body>
</html>`;

  writeFileSync(REPORT_PATH, html);
  console.log(`\n📊 Report: ${REPORT_PATH}`);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function truncate(s,n) { return (s||'').length>n ? (s||'').slice(0,n)+'…' : (s||''); }
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function extractError(d) {
  try { const x=JSON.parse(d); return x.error||x.details?.detail||x.details?.error||String(d).slice(0,80); }
  catch { return String(d).slice(0,80); }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;
const CMDS = {
  demo:     cmdDemo,
  profile:  () => { const a=args[0]; if(!a){console.error('Usage: claw profile <address> [--chain ethereum]');process.exit(1);} const c=args.indexOf('--chain')>=0?args[args.indexOf('--chain')+1]:'ethereum'; cmdProfile(a,c); },
  monitor:  () => { const ci=args.indexOf('--chain'),mi=args.indexOf('--minutes'); cmdMonitor(ci>=0?args[ci+1]:'solana',mi>=0?parseInt(args[mi+1]):30); },
  research: () => cmdResearch(args.join(' '), args.includes('--expert')),
  report:   cmdReport,
  help:     () => console.log(`\n🦞 OpenClaw — Nansen CLI\n\n  claw demo                    15 calls + HTML report\n  claw profile <addr> [--chain]  wallet profile\n  claw monitor --chain <c>      Smart Money flow monitor\n  claw research "<q>" [--expert] ask Nansen AI\n  claw report                   regenerate HTML\n  claw --help                   this help\n`),
};

(async()=>{
  const fn = CMDS[cmd]||CMDS.help;
  await fn();
})().catch(e=>{ console.error('✗',e.message); process.exit(1); });
