# Nansen On-Chain Intelligence — SKILL.md

Access Smart Money flows, wallet profiles, and token analytics via Nansen CLI.

**Requires:** `npm install -g nansen-cli && nansen login --api-key <KEY>`

---

## Wallet Profile

```bash
# Full profile: labels + balance + PnL + transactions
claw profile 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain ethereum

# Individual fields
nansen research profiler labels        --address <addr> --chain ethereum
nansen research profiler balance       --address <addr> --chain ethereum
nansen research profiler pnl-summary   --address <addr> --chain ethereum
nansen research profiler transactions  --address <addr> --chain ethereum --limit 10
```

## Smart Money Flows

```bash
# Net capital flows (inflows vs outflows)
claw monitor solana --minutes 30
nansen research smart-money netflow     --chain solana
nansen research smart-money dex-trades  --chain solana --limit 20
nansen research smart-money holdings     --chain ethereum
```

## Token Research

```bash
# Discover tokens by volume / trending
nansen research token screener --chain solana --timeframe 24h

# Deep token analysis
nansen research token info             --chain ethereum --token <address>
nansen research token holders         --chain solana   --token <mint>
nansen research token indicators      --chain ethereum --token <address>
nansen research token flow-intelligence --chain solana --token <mint>

# Token PnL leaderboard
nansen research token pnl --chain solana --token <mint> --days 30
```

## AI Research Agent

```bash
# Fast query (2000 credits)
nansen agent "What are the top Smart Money inflows on Solana right now?"

# Expert deep dive (7500 credits)
nansen agent "Analyze whale activity patterns on Base" --expert
```

## Supported Chains

`ethereum` · `solana` · `base` · `bnb` · `arbitrum` · `polygon` · `optimism` · `avalanche` · `linea` · `scroll` · `mantle` · `sonic` · `monad`

## Smart Money Labels

`Fund` · `Smart Trader` · `30D/90D/180D Smart Trader` · `Smart HL Perps Trader`

---

## Notes

- Run `claw demo` to generate an HTML report at `report.html`
- All Nansen CLI output is JSON — parse with `JSON.parse()` in scripts
- Endpoints marked as premium require Nansen Pro plan
- `nansen account` — check credits without consuming any
- `nansen schema` — free endpoint, shows all available commands

## OpenClaw Integration

```bash
# Quick wallet check
claw profile <address> --chain ethereum

# Monitor loop (paste output into agent context)
claw monitor solana --minutes 10
```
