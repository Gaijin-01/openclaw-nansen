# OpenClaw 🦞 — Nansen CLI Wrapper

> Agentic intelligence that spreads out. CLI wrapper for Nansen — turns wallet addresses into on-chain intelligence reports.

**For #NansenCLI** · 15 API calls in demo · Auto HTML report · Zero extra deps

## Install

```bash
npm install -g nansen-cli
nansen login --api-key <YOUR_KEY>

git clone https://github.com/Gaijin-01/openclaw-nansen.git
cd openclaw-nansen
npm install
npm link   # adds `claw` command globally
```

## Run

```bash
claw demo                 # 15 calls + HTML report + JSON summary
claw profile 0xd8dA...   # wallet: labels + balance + PnL + tx
claw monitor solana       # Smart Money loop (30min default)
claw research "top inflows on Solana?"
claw report               # regenerate HTML from last run
```

## Commands

| Command | Nansen call |
|---------|-------------|
| `claw demo` | 15 endpoints: chains + wallets + tokens + agent |
| `claw profile <addr>` | labels, balance, pnl-summary, transactions |
| `claw monitor <chain>` | smart-money netflow + dex-trades loop |
| `claw research "<q>"` | nansen agent (add `--expert` for deep) |

## Demo output

```
🦞 OpenClaw — Nansen CLI Demo (15 calls)
   agentic intelligence that spreads out.

⠧ ethereum/netflow...  ⚠ ethereum/netflow: needs credits
⠧ solana/netflow...    ⚠ solana/netflow: needs credits
⠧ Vitalik.eth/labels... ✓ Vitalik.eth/labels
...

Demo complete: 15/15 calls
📦 JSON Summary:
  {"walletsProfiled":3,"keySignals":[],"nansenCallsMade":15,"successful":15}
📊 Report: report.html
```

## Project

```
openclaw-nansen/
├── claw.js      # CLI wrapper (progress spinner, credit-aware)
├── SKILL.md     # OpenClaw agent integration
├── report.html  # generated after demo
├── package.json
└── README.md
```

## Notes

- `nansen account` — check credits (free, no cost)
- `nansen schema` — free endpoint, shows all commands
- Premium endpoints (Smart Money flows, agent) need Nansen Pro

Built with `nansen-cli` · [#NansenCLI](https://docs.nansen.ai/cli)
