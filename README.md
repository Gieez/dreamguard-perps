# DreamGuard 🛡️

**Autonomous Cross-Margin Risk Sentinel & Funding Yield Harvester on dreamDEX**  
*Built for the dreamDEX Perps Builder Bounty on Somnia Tokyo Testnet (Chain ID 50383)*

---

## What is DreamGuard?

DreamGuard is a production-grade autonomous risk sentinel and delta-neutral funding yield harvester built natively on the **dreamDEX CLOB Perps engine** on Somnia.

Perpetual futures markets with extreme capital velocity face two critical operational friction points:
1. **Cascading Liquidation Penalty:** Accounts experience unexpected margin compression during fast mark price swings, causing protocols to penalize traders with aggressive liquidation waterfall fees.
2. **Unclaimed Funding Inefficiencies:** Massive funding rate imbalances (e.g. BTC-PERP paying over 140% annualized APR to short positions) sit uncollected due to lack of automated execution.

DreamGuard solves both challenges autonomously:
- **Cross-Margin Health Sentinel:** Continuously monitors account margin equity against protocol maintenance margin requirements (`mmReq`). Automatically triggers proactive risk reduction (50% trim) at `< 2.0x` and emergency liquidation-prevention flattening at `< 1.25x`.
- **Funding Yield Harvester:** Real-time multi-market scanner across all 21 live Somnia perp markets. Identifies extreme APR differentials (> 50% APR), calculates paying side, and executes non-custodial carry orders.
- **Non-Custodial Delegated Architecture:** Trades on behalf of Somnia Smart Accounts via the **Operator Permissions Registry** (`placeOrderFor`, `cancelOrderFor`). The bot signs orders and pays gas but has zero withdrawal authority.

---

## Who is it for?

1. **Perpetual Futures Traders & Liquidity Providers:** Protect account collateral 24/7 with automated de-risking before protocol liquidators intervene.
2. **Yield Farmers & Arbitrageurs:** Harvest triple-digit funding APRs across volatile meme and blue-chip perps without manual order monitoring.
3. **Autonomous Agent Operators:** Developers seeking a robust, non-custodial execution engine leveraging Somnia's account abstraction primitives.

---

## Proof of Building on Somnia Tokyo Testnet (Chain 50383)

Every trade and action performed by DreamGuard interacts with live dreamDEX contracts on the Somnia Tokyo/Hideki testnet:

| Metric | On-Chain Value |
|---|---|
| **Network** | Somnia Tokyo / Hideki Testnet (`50383`) |
| **Trading Smart Account (Wallet 1)** | `0xEe88c3D95B2F6D35b143bF78316821016a291785` |
| **Delegated Operator Bot Key** | `0x8c7e9D491ce0fDF987034aE22cEAC6f65C709306` |
| **Operator Permissions Registry** | `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a` |
| **Live Open Position Tx** | [`0x602235a67a9363cf5156485bfc59d1d70de53286f50fb925ad5369049b9c7867`](https://github.com/Gieez/dreamguard-perps) |
| **Live Close Position Tx** | [`0x68c772d91fbe5e6d7e107bd2e857c31cc78a6c78c5696b9ffc27acddafeb0621`](https://github.com/Gieez/dreamguard-perps) |
| **Verified Order IDs** | `11658342254584444194758` (Open), `21582690566240182964317` (Close) |

---

## X (Twitter) Posts Section

As required by the DoraHacks bounty specification, here are the public updates documenting DreamGuard:

- **Announcement & On-Chain Proof:** [https://x.com/Gieez__/status/2114230071225680073](https://x.com/Gieez__/status/2114230071225680073)
- **Technical Architecture Thread:** [https://x.com/Gieez__/status/2114230071225680073](https://x.com/Gieez__/status/2114230071225680073) (Reply Thread tagging `@DreamDEXSomnia`)

---

## Feedback Track: 5 Reproducible Reports

DreamGuard thoroughly stress-tested the SDK, API, smart contract interfaces, and documentation. All 5 issues are documented in [`feedback/`](feedback/) adhering to DoraHacks submission standards:

1. [`feedback/01-placeresult-omits-tx-hash.md`](feedback/01-placeresult-omits-tx-hash.md) — SDK `PlaceResult` interface omits on-chain transaction hash from returned placement object.
2. [`feedback/02-network-naming-ambiguity-tokyo-vs-hideki.md`](feedback/02-network-naming-ambiguity-tokyo-vs-hideki.md) — Discrepancy between bounty documentation ("Tokyo Testnet") and SDK environment configuration (`NETWORK=hideki`).
3. [`feedback/03-link-a-bot-smart-account-vs-eoa-docs-gap.md`](feedback/03-link-a-bot-smart-account-vs-eoa-docs-gap.md) — Critical documentation gap: `OWNER_ADDRESS` must be the deployed Smart Account (Wallet 1), not the login EOA.
4. [`feedback/04-trading-key-leverage-adjustment-permission.md`](feedback/04-trading-key-leverage-adjustment-permission.md) — Operator permission registry does not delegate dynamic leverage adjustment to trading keys.
5. [`feedback/05-sdk-type-definitions-compiler-target-incompatibility.md`](feedback/05-sdk-type-definitions-compiler-target-incompatibility.md) — Upstream SDK type declarations fail under standard ES2020 / ES2021 compiler targets.

---

## Architecture & Somnia Primitives

```
┌─────────────────────────────────────────────────────────────┐
│                    DREAMGUARD ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────┘
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│   Risk Sentinel Core    │             │ Funding Yield Harvester │
│ • Cross-margin Health   │             │ • 21-Market Live Radar  │
│ • Equity / mmReq Guard  │             │ • Delta-Neutral Carry   │
│ • Proactive De-risking  │             │ • Sizing & Align Engine │
└─────────────────────────┘             └─────────────────────────┘
     │                                               │
     └───────────────────────┬───────────────────────┘
                             ▼
       ┌───────────────────────────────────────────┐
       │   Operator Permissions Registry           │
       │   (0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE)│
       │   • placeOrderFor (0x80054449)            │
       │   • cancelOrderFor (0xe37b444b)           │
       └───────────────────────────────────────────┘
                             │
                             ▼
       ┌───────────────────────────────────────────┐
       │   Somnia CLOB Engine (Chain 50383)        │
       │   Sub-second Block Settlement & Auto-Pull │
       └───────────────────────────────────────────┘
```

---

## Quickstart & Installation

### 1. Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### 2. Clone & Install
```bash
git clone https://github.com/Gieez/dreamguard-perps.git
cd dreamguard-perps
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

Key configuration parameters in `.env`:
```ini
NETWORK=hideki
CHAIN_ID=50383
RPC_URL=https://api.hideki2.infra.testnet.somnia.network
WS_RPC_URL=wss://api.hideki2.infra.testnet.somnia.network/ws
INDEXER_URL=https://hideki-dev.smk.somnia.host/v1/graphql
OWNER_ADDRESS=0xYourSomniaSmartAccountAddress
PRIVATE_KEY=0xYourOperatorBotPrivateKey
DRY_RUN=false
```

### 4. Run Preflight Check
Inspect your MarginBank status, gas balance, and 21 live perp markets:
```bash
npm run dreamguard:doctor
```

Or view complete telemetry status:
```bash
npm run dreamguard:status
```

### 5. Launch the Sentinel Daemon
Run DreamGuard's continuous autonomous risk sentinel & funding harvester:
```bash
npm run dreamguard:sentinel
```

### 6. Interactive Telemetry Dashboard
Open the live dashboard in your browser:
```bash
open dashboard/index.html
```

---

## License
MIT License. Built with ❤️ for the Somnia ecosystem and dreamDEX developer community.
