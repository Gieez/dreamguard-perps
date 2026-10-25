import {
  ORDER_TYPE,
  createExchange,
  loadEnv,
  requireMarket,
  tradingKeyCheck,
  preflight,
  positionIn,
  placePerp,
  liveMark,
  sizeForNotional,
  sizeOrder,
  shutdown,
} from "@dreamdex-bot-kit/perp-core";

loadEnv();

async function main() {
  const notional = Number(process.env.PERP_NOTIONAL_USDSO || 20);
  const symbol = process.env.PERP_SYMBOL || "BTC-PERP";
  const side = (process.env.PERP_SIDE || "long").toLowerCase() === "short" ? "short" : "long";

  console.log(`[test-order] Initializing on ${symbol} | Side: ${side} | Notional: ${notional} USDso`);

  const ctx = createExchange({ withSigner: true });
  const market = await requireMarket(ctx.exchange, symbol);
  const me = ctx.exchange.walletAddress as `0x${string}`;

  const link = await tradingKeyCheck(ctx, market);
  console.log(`[test-order] ${link.message}`);
  if (!link.ok) {
    throw new Error("Trading key is not authorized for this market");
  }

  const check = await preflight(ctx.exchange, market, me, {
    requiredUsdso: notional / 2,
    linkedAccount: true,
  });
  console.log(`[test-order] Preflight: ${check.message}`);
  if (!check.ok) {
    throw new Error("Preflight failed");
  }

  const existing = await positionIn(ctx.exchange, market);
  if (existing) {
    console.log(`[test-order] Existing position: ${existing.side} ${existing.contracts} ${market.info.baseSymbol} (uPnL: ${existing.unrealizedPnl ?? 0})`);
  }

  const book = await ctx.exchange.fetchOrderBook(market.symbol, 1);
  const touch = side === "long" ? book.asks[0]?.[0] : book.bids[0]?.[0];
  if (touch === undefined) {
    throw new Error("No counterparty on orderbook");
  }

  const price = BigInt(Math.round(touch * 1e18));
  const mark = await liveMark(ctx.exchange, market);
  const wanted = sizeForNotional(notional, market.info, mark);

  const sized = await sizeOrder(ctx.exchange, {
    market,
    account: me,
    side,
    price,
    wanted,
    autoPull: false,
    tradingKey: ctx.tradingKey,
  });

  if (!sized.ok) {
    throw new Error(`Size rejected: ${sized.reason}`);
  }

  console.log(`[test-order] Placing ${side} order: size ${sized.quantity} raw units @ price ${touch}`);

  const opened = await placePerp({
    ctx,
    market,
    side,
    price,
    quantity: sized.quantity,
    orderType: ORDER_TYPE.MARKET,
    label: "bounty-proof-open",
  });

  console.log(`[test-order] Result: sent=${opened.sent}, orderId=${opened.orderId}, filled=${opened.filled}`);

  // Fetch updated position
  const updatedPos = await positionIn(ctx.exchange, market);
  if (updatedPos) {
    console.log(`[test-order] Verified Live Position: ${updatedPos.side} ${updatedPos.contracts} ${market.info.baseSymbol} | Entry: ${updatedPos.entryPrice}`);
  }

  await shutdown(ctx);
  console.log("[test-order] SUCCESS");
}

main().catch((err) => {
  console.error("[test-order] Error:", err);
  process.exit(1);
});
