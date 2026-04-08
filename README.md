# OpenClaw 🦞 — Nansen-Powered On-Chain Claw

> Agentic intelligence that spreads out. Now with real-time Nansen on-chain alpha.

**OpenClaw** is a lightweight, distributed agentic framework (inference swarm ready) that wraps the Nansen CLI into autonomous loops, wallet monitors, and token research pipelines — designed for terminal-native Smart Money hunting.

Submission for [#NansenCLI](https://docs.nansen.ai/cli) final week · Built in <60 minutes · **16 Nansen CLI calls** in demo · Fully open-source

---

## Why OpenClaw + Nansen CLI?

- **Nansen CLI** gives terminal-native access to Smart Money flows, wallet profiling, token analytics, and AI-powered research — no dashboard, no copy-paste.
- **OpenClaw** turns those commands into autonomous agents that run in loops, swarm, or slot into a larger on-chain intelligence pipeline.
- **Perfect for:** agents that monitor whale movements 24/7, alert pipelines, proto-Sparkdex-style signal engines, and research automation.
- Zero extra dependencies beyond `nansen-cli`.

---

## Features

- 🦞 One-command wallet profiling + Smart Money tagging
- 📊 Continuous Smart Money flow monitor (loop with auto-refresh)
- 🔬 Natural-language research via Nansen AI agent (`--expert` for deep dive)
- 📈 Token screener + holder analysis + PnL leaderboard
- 📄 Auto-generated HTML report from every demo/monitor run
- 🔗 Ready for **OpenClaw SKILL.md** integration (Claude Code, Codex, OpenClaw agents)
- ⚡ Easily extendable to multi-agent swarms or on-chain execution

---

## Quick Start

### 1. Install Nansen CLI + authenticate

```bash
npm install -g nansen-cli
nansen login --api-key <YOUR_NANSEN_API_KEY>
# or: export NANSEN_API_KEY=your_key_here
```

### 2. Clone & run

```bash
git clone https://github.com/wner/openclaw-nansen.git
cd openclaw-nansen
npm install   # tiny wrapper deps only

# Demo (16 API calls + HTML report)
node claw.js demo

# Single wallet profile
node claw.js profile 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain ethereum

# Smart Money monitor (30min loop)
node claw.js monitor --chain solana --minutes 30

# Natural language research
node claw.js research "What are the top Smart Money inflows on Solana right now?"
node claw.js research "Analyze whale activity on Base" --expert
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `claw.js demo` | Full demo: 16 API calls across chains, wallets, tokens, agent · generates `report.html` |
| `claw.js profile <addr> [--chain eth]` | Wallet profile: labels, balance, PnL, recent transactions |
| `claw.js monitor --chain <chain> --minutes <N>` | Smart Money flow loop: netflow + DEX trades + wallet profiles |
| `claw.js research "<question>"` | Ask Nansen AI agent (fast mode) |
| `claw.js research "<question>" --expert` | Ask Nansen AI agent in expert mode (deeper analysis) |
| `claw.js report` | Re-generate HTML report from last run |

### Supported chains
`ethereum` · `solana` · `base` · `bnb` · `arbitrum` · `polygon` · `optimism` · `avalanche` · `linea` · `scroll` · `mantle` · `ronin` · `sei` · `sonic` · `monad`

---

## Demo Proof: 16 API Calls

```
node claw.js demo

▶ Chain: ETHEREUM   ✓ smart-money netflow
                   ✓ smart-money holdings
▶ Chain: SOLANA     ✓ smart-money netflow
                   ✓ smart-money holdings
▶ Chain: BASE       ✓ smart-money netflow
                   ✓ smart-money holdings
▶ Wallet: Vitalik.eth  ✓ labels + balance + transactions
▶ Wallet: Binance Wallet ✓ labels + balance + transactions  
▶ Wallet: Solana Whale  ✓ labels + balance + transactions
                   ✓ token screener [solana]
                   ✓ nansen agent (fast)

Demo complete: 16 calls attempted, 13 returned data
📊 Report written: report.html
```

---

## Project Structure

```
openclaw-nansen/
├── claw.js          # Main wrapper + all commands
├── report.html       # Auto-generated (beautiful) summary
├── package.json
├── README.md
└── .last_run.json   # Last demo data (for report regeneration)
```

---

## How It Maps to Nansen CLI

| OpenClaw command | Nansen CLI under the hood |
|-----------------|--------------------------|
| `claw.js profile` | `nansen research profiler labels/balance/pnl-summary/transactions` |
| `claw.js monitor` | `nansen research smart-money netflow + dex-trades` + profiler loop |
| `claw.js demo` | All of the above + `nansen research token screener` + `nansen agent` |
| `claw.js research` | `nansen agent "<question>" [--expert]` |

---

## OpenClaw Agent Integration

Drop this into any OpenClaw SKILL.md for native Nansen access:

```markdown
## Nansen On-Chain Skill

### Wallet Profile
\`\`\`bash
nansen research profiler labels --address <addr> --chain <chain>
nansen research profiler balance --address <addr> --chain <chain>
\`\`\`

### Smart Money Monitor
\`\`\`bash
nansen research smart-money netflow --chain <chain>
nansen research smart-money dex-trades --chain <chain>
\`\`\`

### Token Research
\`\`\`bash
nansen research token screener --chain <chain>
nansen agent "<question>"
\`\`\`
```

---

## Vision

OpenClaw is an inference swarm — a network of specialized agents that delegate, verify, and compound intelligence. Nansen CLI is the **Smart Money sensing layer** for that swarm: real-time on-chain alpha that feeds wallet-tracking agents, alert pipelines, and research bots.

The goal: autonomous on-chain intelligence that never sleeps, always tracks Smart Money, and surfaces alpha before the crowd.

🦞 *Agentic intelligence that spreads out.*

---

**Built with:** [nansen-cli](https://github.com/nansen-ai/nansen-cli) · [OpenClaw](https://github.com/openclaw/openclaw)  
**Challenge:** [#NansenCLI](https://docs.nansen.ai/cli) · Closes April 12, 2026
