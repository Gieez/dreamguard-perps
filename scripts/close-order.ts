import {
  createExchange,
  loadEnv,
  requireMarket,
  tradingKeyCheck,
  positionIn,
  closePosition,
  shutdown,
} from "@dreamdex-bot-kit/perp-core";

loadEnv();

async function main() {
  const symbol = process.env.PERP_SYMBOL || "BTC-PERP";

  console.log(`[close-order] Initializing close on ${symbol}`);

  const ctx = createExchange({ withSigner: true });
  const market = await requireMarket(ctx.exchange, symbol);
  const me = ctx.exchange.walletAddress as `0x${string}`;

  const link = await tradingKeyCheck(ctx, market);
  console.log(`[close-order] ${link.message}`);
  if (!link.ok) {
    throw new Error("Trading key is not authorized for this market");
  }

  const existing = await positionIn(ctx.exchange, market);
  if (!existing) {
    console.log(`[close-order] No open position found on ${symbol}`);
    await shutdown(ctx);
    return;
  }

  console.log(`[close-order] Found position: ${existing.side} ${existing.contracts} ${market.info.baseSymbol} (uPnL: ${existing.unrealizedPnl ?? 0})`);

  const res = await closePosition(ctx, market, me, { label: "bounty-proof-close" });
  console.log(`[close-order] Closed result: sent=${res.sent}, filled=${res.filled}, tx=${(res as any).hash ?? "-"}`);

  const remaining = await positionIn(ctx.exchange, market);
  console.log(`[close-order] Remaining position:`, remaining ?? "Flat (completely closed)");

  await shutdown(ctx);
  console.log("[close-order] SUCCESS");
}

main().catch((err) => {
  console.error("[close-order] Error:", err);
  process.exit(1);
});
