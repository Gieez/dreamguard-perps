# dreamguard-sentinel

Autonomous cross-margin risk sentinel and delta-neutral funding rate yield harvester on dreamDEX (Somnia CLOB perps).

## What it does

1. **Cross-Margin Health Sentinel:**
   - Polls MarginBank equity and maintenance requirement (`mmReq`).
   - Automatically reduces position size by 50% when `healthRatio < 2.0x`.
   - Executes emergency liquidation prevention flatten when `healthRatio < 1.25x`.

2. **Funding Yield Harvester:**
   - Scans all 21 live perp markets on Somnia testnet.
   - Computes annualized funding APR and identifies which side earns the carry rate.
   - Enters delta-neutral carry trades whenever APR exceeds threshold (default: 50% APR).

## How to run

Locally:
```bash
npm run dreamguard:sentinel
```

With custom knobs:
```bash
DREAMGUARD_MIN_HEALTH=2.0
DREAMGUARD_EMERGENCY_HEALTH=1.25
DREAMGUARD_MIN_FUNDING_APR=0.50
DREAMGUARD_CARRY_NOTIONAL=20
DREAMGUARD_POLL_MS=15000
npm run dreamguard:sentinel
```
