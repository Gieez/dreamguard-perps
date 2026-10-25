# PlaceResult omits transaction hash from placement response
Severity: normal
Area: SDK

## Steps to reproduce
1. Import `placePerp` from `@dreamdex-bot-kit/perp-core`.
2. Configure a valid trading key or private key with sufficient margin on Somnia Hideki testnet.
3. Call `placePerp({ ctx, market, side: "long", price, quantity, orderType: ORDER_TYPE.MARKET })`.
4. Inspect the returned object `PlaceResult`.

## Expected
`PlaceResult` should return the on-chain transaction hash (`hash: string` or `hash: Hex`) alongside `orderId` and `filled`, so trading bots and developer telemetry can persist transaction receipts and provide on-chain verification without monkey-patching or intercepting the internal viem client.

## Actual
`PlaceResult` only returns:
```ts
export interface PlaceResult {
  sent: boolean;
  orderId?: bigint;
  filled: bigint;
  noFill?: boolean;
}
```
The internal `send()` method in `operator.ts` already receives `{ hash, receipt }`, but `placeFor()` drops `hash` when constructing the return object, forcing developers to manually patch `orders.ts` to retrieve the transaction hash.

## Evidence
- Open Position Transaction on Hideki: `0x602235a67a9363cf5156485bfc59d1d70de53286f50fb925ad5369049b9c7867`
- Code inspection at `packages/perp-core/src/orders.ts` line 196:
```ts
const filled = (res.fills ?? []).reduce((sum, f) => sum + f.quantityFilled, 0n);
console.log(`placed ${what} | filled ${Number(filled) / 10 ** market.info.baseDecimals} | order ${res.orderId ?? "-"}`);
return { sent: true, orderId: res.orderId, filled }; // hash is discarded
```

## Environment
- SDK: `@dreamdex-bot-kit/perp-core` v0.1.0 (`@somnia-chain/markets-sdk` v0.31.0)
- Network: Somnia Hideki Testnet (Chain ID 50383)
- Wallet address: `0xEe88c3D95B2F6D35b143bF78316821016a291785` (Smart Account) / `0x8c7e9D491ce0fDF987034aE22cEAC6f65C709306` (Trading Key)
