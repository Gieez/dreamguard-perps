# TypeScript definition files fail compilation when consumer project targets standard ES2020/ES2021
Severity: normal
Area: SDK

## Steps to reproduce
1. Create a clean TypeScript consumer project importing `@dreamdex-bot-kit/perp-core` and `@somnia-chain/markets-sdk`.
2. Configure standard `tsconfig.json` with `"target": "ES2020"` or `"ES2021"` and standard `"lib": ["ES2020", "DOM"]`.
3. Run `tsc --noEmit`.

## Expected
The SDK and core helper packages should ship cleanly transpiled declarations (`.d.ts`) compatible with standard Node/browser TypeScript compiler targets without missing ambient DOM/Node types.

## Actual
The compiler produces numerous errors:
```text
node_modules/@somnia-chain/markets-sdk/dist/errors.d.ts: error TS2304: Cannot find name 'ErrorOptions'.
packages/perp-core/src/funding.ts: error TS2737: BigInt literals are not available when targeting lower than ES2020.
packages/perp-core/src/operator.ts: error TS2345: Argument of type ... is not assignable to parameter of type 'ReadContractParameters' ... Property 'authorizationList' is missing.
```
Consumers are forced to override their root `tsconfig.json` with `"skipLibCheck": true` and `"target": "ESNext"` to suppress broken upstream types.

## Evidence
`tsc --noEmit` error log on standard workspace build:
```text
packages/perp-core/node_modules/@somnia-chain/markets-sdk/dist/errors.d.ts(35,44): error TS2304: Cannot find name 'ErrorOptions'.
packages/perp-core/node_modules/@somnia-chain/markets-sdk/dist/errors.d.ts(63,44): error TS2304: Cannot find name 'ErrorOptions'.
```

## Environment
- SDK: `@dreamdex-bot-kit/perp-core` v0.1.0 (`@somnia-chain/markets-sdk` v0.31.0)
- TypeScript: v5.5.0
- Node: v24.19.0
