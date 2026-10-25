# Network naming discrepancy between bounty documentation (Tokyo Testnet) and SDK config (Hideki)
Severity: normal
Area: docs

## Steps to reproduce
1. Read the DoraHacks Bounty specifications which repeatedly instruct builders: "Perps Builder Bounty is a developer program for dreamDEX perps on Somnia Tokyo testnet".
2. Configure `.env` with `NETWORK=tokyo`.
3. Run `npm run perp:doctor` or initialize `createExchange()`.

## Expected
Either:
- `NETWORK=tokyo` should be supported as an alias for Hideki testnet (chain 50383), or
- The developer documentation and quickstart guides should explicitly note that Somnia Tokyo testnet is identified internally as `NETWORK=hideki`.

## Actual
Startup crashes with:
```text
Error: NETWORK="tokyo" is not a perp network. Use NETWORK=hideki (Perps Arena) or NETWORK=testnet (Shannon).
```
`packages/perp-core/src/config.ts` only recognizes:
```ts
export type Network = "hideki" | "testnet" | "mainnet";
```
New builders coming from DoraHacks are led to believe Tokyo is a separate network or that their configuration is invalid.

## Evidence
`packages/perp-core/src/config.ts`:
```ts
const PERP_NETWORKS: readonly Network[] = ["hideki", "testnet"];
// ...
if (!PERP_NETWORKS.includes(raw as Network)) {
  throw new Error(`NETWORK="${raw}" is not a perp network. Use NETWORK=hideki (Perps Arena) or NETWORK=testnet (Shannon).`);
}
```

## Environment
- SDK: `@dreamdex-bot-kit/perp-core` v0.1.0
- Network: Somnia Hideki / Tokyo Testnet (Chain ID 50383)
- Node: v24.19.0
