# Trading Key cannot adjust account leverage programmatically via SDK
Severity: normal
Area: contracts

## Steps to reproduce
1. Link a trading bot key via the web interface ("Link a bot" -> Perps enabled).
2. Configure a trading bot with `OWNER_ADDRESS` set to the trading account and `PRIVATE_KEY` set to the bot key.
3. Call `ensureLeverage(ctx, market, me, LEVERAGE)` from a strategy script.

## Expected
Either:
1. The OperatorPermissionsRegistry should include an authorized function selector for `setLeverageFor(owner, pool, leverage)` so automated risk agents can dynamically throttle leverage based on market volatility, or
2. The SDK documentation should explicitly declare that leverage setting is strictly an owner-only action that cannot be delegated to an operator key.

## Actual
The function silently skips modifying the leverage on-chain and logs:
```text
leverage on BTC-PERP is unset for this account; a trading key cannot change it. Set 2x in the app if you want it, sizing follows the account's setting.
```
This forces developers building dynamic volatility/risk-hedging bots to rely on manual UI interaction for initial leverage configuration rather than full autonomy.

## Evidence
`packages/perp-core/src/margin.ts`:
```ts
// With an OWNER_ADDRESS set, the signer is an operator key. The registry authorises
// place/cancel/reduce for the account, NOT setLeverage: the pool requires the account
// itself. Changing it here would revert with OnlyApprovedContracts.
if (ctx.tradingKey) {
  return { changed: false, ownerOnly: true, from: current, to: current };
}
```

## Environment
- SDK: `@dreamdex-bot-kit/perp-core` v0.1.0
- Network: Somnia Hideki Testnet (Chain ID 50383)
- Account: `0xEe88c3D95B2F6D35b143bF78316821016a291785`
