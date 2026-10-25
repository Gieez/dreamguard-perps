# "Link a bot" documentation omits requirement that OWNER_ADDRESS must be Somnia Smart Account address, not login EOA
Severity: major
Area: docs

## Steps to reproduce
1. Connect a standard Web3 browser wallet (e.g. Brave/MetaMask EOA `0x06014B...455f`) to `https://app.testnet.dreamdex.io`.
2. Follow the documentation in `docs/trading/common/link-a-bot` and `docs/perps.md`:
   "Run the bot with the bot key as PRIVATE_KEY and your account as OWNER_ADDRESS:
    NETWORK=hideki
    PRIVATE_KEY=0x...
    OWNER_ADDRESS=0x... (user pastes their connected MetaMask EOA)"
3. Run `npx tsx scripts/perp-doctor.ts`.

## Expected
Documentation should explicitly emphasize that dreamDEX deploys an abstracted Somnia Smart Account (e.g. "Wallet 1: `0xEe88c...`") for the connected trader, and that `OWNER_ADDRESS` in `.env` MUST be this Smart Account address (retrievable from the wallet list / Details modal), NOT the EOA address displayed in MetaMask.

## Actual
When a user sets `OWNER_ADDRESS` to their browser EOA:
1. `perp-doctor` reports:
   ```text
   link : NOT LINKED · open the wallet in the app, choose Link a bot, tick Perps and paste 0x8c7e9...
   margin : unlocked 0.00 · locked 0.00 · equity 0.00
   ```
2. The user is confused because they already completed "Link a bot" and the app displays 1,000 USDso in Margin.
3. Every order attempt reverts with authorization failure because the Operator Permissions Registry grants permissions for the Smart Account, not the EOA.

## Evidence
- Connected Browser EOA: `0x06014B4110fEe8fbb1b0D45c9fe443b6DbBF455f`
- Actual Smart Account (Wallet 1): `0xEe88c3D95B2F6D35b143bF78316821016a291785`
- Once `OWNER_ADDRESS` was changed to `0xEe88c3...`, `perp-doctor` immediately resolved:
   ```text
   link : ok on all 21 markets
   margin : unlocked 1000.00 · locked 0.00 · equity 1000.00
   ```

## Environment
- SDK: `@dreamdex-bot-kit/perp-core` v0.1.0
- Web App: `app.testnet.dreamdex.io`
- Network: Somnia Hideki Testnet (Chain ID 50383)
