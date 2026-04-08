# OpenClaw 🦞 — Nansen CLI Wrapper

CLI wrapper for [Nansen](https://nansen.ai) — turns wallet addresses into on-chain intelligence reports. Run `node claw.js demo` and get an HTML report.

**For #NansenCLI** · Demo: 15 API calls · Auto HTML report

## Install

```bash
npm install -g nansen-cli
nansen login --api-key <YOUR_KEY>
git clone https://github.com/Gaijin-01/openclaw-nansen.git
cd openclaw-nansen && npm install
```

## Run

```bash
node claw.js demo        # 15 calls → HTML report
node claw.js profile 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain ethereum
node claw.js monitor --chain solana --minutes 30
```

## What it does

| Command | Nansen call |
|---------|------------|
| `claw.js demo` | 15 endpoints across chains + wallets + tokens + agent |
| `claw.js profile <addr>` | labels + balance + PnL + transactions |
| `claw.js monitor` | Smart Money netflow loop + DEX trades |

Output: terminal + `report.html` (dark, auto-generated).

## Project

```
openclaw-nansen/
├── claw.js      # main CLI
├── report.html  # generated after demo
├── package.json
└── README.md
```

Built with `nansen-cli` · #NansenCLI
