/**
 * @license
 * DreamGuard - Autonomous Cross-Margin Risk Sentinel & Funding Yield Harvester
 * Built for the dreamDEX Perps Builder Bounty on Somnia Tokyo Testnet
 */

import {
  ORDER_TYPE,
  closePosition,
  createExchange,
  envBool,
  envNum,
  healthRatio,
  linkCoverage,
  liveFunding,
  liveMark,
  loadEnv,
  marginSnapshot,
  markOf,
  onStop,
  perpMarkets,
  placePerp,
  positionIn,
  preflight,
  requireMarket,
  shutdown,
  sizeForNotional,
  sizeOrder,
  sleep,
  tradingKeyCheck,
  type PerpMarket,
  type Side,
} from "@dreamdex-bot-kit/perp-core";
import { formatUnits } from "viem";

loadEnv();

// Configuration Knobs
const MIN_HEALTH = envNum("DREAMGUARD_MIN_HEALTH", 2.0);
const EMERGENCY_HEALTH = envNum("DREAMGUARD_EMERGENCY_HEALTH", 1.25);
const MIN_FUNDING_APR = envNum("DREAMGUARD_MIN_FUNDING_APR", 0.50); // 50% APR
const CARRY_NOTIONAL = envNum("DREAMGUARD_CARRY_NOTIONAL", 20); // 20 USDso
const POLL_MS = envNum("DREAMGUARD_POLL_MS", 15_000);
const HARVEST_ENABLED = envBool("DREAMGUARD_HARVEST_ENABLED", true);

interface Opportunity {
  market: PerpMarket;
  apr: number;
  side: Side;
  mark: number;
  spreadBps: number;
}

async function scanFundingOpportunities(
  ctx: ReturnType<typeof createExchange>,
  markets: PerpMarket[],
): Promise<Opportunity[]> {
  const opps: Opportunity[] = [];

  for (const m of markets) {
    try {
      const f = await liveFunding(ctx.exchange, m);
      if (!f) continue;

      const mark = (await liveMark(ctx.exchange, m)) ?? markOf(m.info);
      const book = await ctx.exchange.fetchOrderBook(m.symbol, 1);
      const bestBid = book.bids[0]?.[0];
      const bestAsk = book.asks[0]?.[0];
      const spreadBps = bestBid && bestAsk && mark > 0
        ? Math.round(((bestAsk - bestBid) / mark) * 10_000)
        : 0;

      // Positive funding rate pays shorts; negative funding rate pays longs
      const payingSide: Side = f.apr >= 0 ? "short" : "long";
      const absApr = Math.abs(f.apr);

      opps.push({
        market: m,
        apr: absApr,
        side: payingSide,
        mark,
        spreadBps,
      });
    } catch {
      // skip un-priceable markets
    }
  }

  return opps.sort((a, b) => b.apr - a.apr);
}

async function main(): Promise<void> {
  const isLive = process.env.DRY_RUN === "false";
  const ctx = createExchange({ withSigner: isLive });
  const stopped = onStop();
  const me = ctx.exchange.walletAddress as `0x${string}`;

  console.log("================================================================================");
  console.log(" 🛡️  DreamGuard: Autonomous Cross-Margin Risk Sentinel & Funding Yield Harvester");
  console.log("    Network: Somnia Hideki / Tokyo Testnet (Chain ID 50383)");
  console.log("    Venue: dreamDEX CLOB Perps (Operator Permissions Registry Mode)");
  console.log("================================================================================");
  console.log(`Account (Smart Wallet) : ${me}`);
  console.log(`Bot Operator Key       : ${ctx.tradingKey?.operator ?? "Local Key"}`);
  console.log(`Execution Mode         : ${isLive ? "LIVE ON-CHAIN" : "DRY-RUN (Simulated)"}`);
  console.log(`Risk Sentinel Threshold: Reduce < ${MIN_HEALTH}x | Emergency Flatten < ${EMERGENCY_HEALTH}x`);
  console.log(`Funding Harvest Target : Minimum ${(MIN_FUNDING_APR * 100).toFixed(0)}% APR | Max Notional: ${CARRY_NOTIONAL} USDso`);
  console.log("================================================================================\n");

  const markets = await perpMarkets(ctx.exchange, true);
  if (markets.length === 0) {
    throw new Error("No live perp markets found on current network");
  }

  // Preflight operator link coverage
  if (ctx.tradingKey) {
    const { linked, missing } = await linkCoverage(ctx, markets);
    if (linked.length === 0) {
      throw new Error(`Trading key is not linked to account ${me} on any perp market`);
    }
    console.log(`[Coverage] Operator authorized on ${linked.length}/${markets.length} perp markets.`);
  }

  console.log("[DreamGuard] Sentinel armed. Polling every " + POLL_MS / 1000 + "s. Press Ctrl-C to stop.\n");

  let cycle = 0;
  while (!stopped()) {
    cycle++;
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`--- [Cycle #${cycle} | ${timestamp} UTC] Checking Margin & Risk State ---`);

    // 1. Margin and Health Analysis
    const snap = await marginSnapshot(ctx.exchange, markets[0], me);
    const health = healthRatio(snap);
    const unlocked = Number(formatUnits(snap.unlocked, 18)).toFixed(2);
    const equity = Number(formatUnits(snap.equity, 18)).toFixed(2);
    const locked = Number(formatUnits(snap.locked, 18)).toFixed(2);
    const isFiniteHealth = Number.isFinite(health);

    console.log(
      `[MarginBank] Equity: ${equity} USDso | Unlocked: ${unlocked} | Locked: ${locked} | ` +
      `Health: ${isFiniteHealth ? health.toFixed(2) + "x" : "∞ (No open exposure)"}`
    );

    const positions = await ctx.exchange.fetchPositions();
    if (positions.length > 0) {
      console.log(`[Positions] ${positions.length} active exposure(s):`);
      for (const p of positions) {
        console.log(`  • ${p.symbol}: ${p.side.toUpperCase()} ${p.contracts} | uPnL: ${p.unrealizedPnl?.toFixed(4) ?? "0"} USDso`);
      }
    }

    // 2. Sentinel Action: Risk Prevention / Liquidation Avoidance
    if (isFiniteHealth && health < EMERGENCY_HEALTH) {
      console.warn(`🚨 [EMERGENCY] Account health ${health.toFixed(2)}x breached emergency limit (${EMERGENCY_HEALTH}x)!`);
      console.warn("🚨 [ACTION] Executing immediate position liquidation avoidance flatten...");

      for (const pos of positions) {
        const targetMarket = markets.find((m) => m.symbol === pos.symbol);
        if (!targetMarket) continue;
        console.log(`[Emergency Flatten] Closing ${pos.symbol}...`);
        await closePosition(ctx, targetMarket, me, { label: "dreamguard-emergency-flatten" });
      }
    } else if (isFiniteHealth && health < MIN_HEALTH) {
      console.warn(`⚠️ [WARNING] Account health ${health.toFixed(2)}x below safety limit (${MIN_HEALTH}x).`);
      console.warn("⚠️ [ACTION] De-risking: Trimming exposure by 50%...");

      if (positions.length > 0) {
        const highestRisk = positions[0];
        const targetMarket = markets.find((m) => m.symbol === highestRisk.symbol);
        if (targetMarket) {
          await closePosition(ctx, targetMarket, me, { fraction: 0.5, label: "dreamguard-risk-trim" });
        }
      }
    } else {
      console.log(`✅ [Risk Status] Health status OK. No de-risking required.`);
    }

    // 3. Harvester Action: Funding Yield Arbitrage
    if (HARVEST_ENABLED && (!isFiniteHealth || health >= MIN_HEALTH)) {
      console.log("[Harvester] Scanning 21 markets for extreme funding rate yields...");
      const opps = await scanFundingOpportunities(ctx, markets);

      if (opps.length > 0) {
        const top = opps[0];
        console.log(`[Top Yield] ${top.market.display} APR: ${(top.apr * 100).toFixed(2)}% | Earns: ${top.side.toUpperCase()} | Spread: ${top.spreadBps} bps`);

        // Check if top yield exceeds entry threshold
        if (top.apr >= MIN_FUNDING_APR) {
          const alreadyExposed = positions.some((p) => p.symbol === top.market.symbol);
          if (alreadyExposed) {
            console.log(`[Harvester] Already holding carry position on ${top.market.display}. Collecting yield.`);
          } else {
            console.log(`🎯 [Opportunity Trigger] ${(top.apr * 100).toFixed(1)}% APR on ${top.market.display} exceeds threshold ${(MIN_FUNDING_APR * 100).toFixed(0)}%!`);
            console.log(`[Harvester] Opening ${top.side.toUpperCase()} carry position for ${CARRY_NOTIONAL} USDso...`);

            try {
              const book = await ctx.exchange.fetchOrderBook(top.market.symbol, 1);
              const touch = top.side === "long" ? book.asks[0]?.[0] : book.bids[0]?.[0];
              if (touch !== undefined) {
                const price = BigInt(Math.round(touch * 1e18));
                const wanted = sizeForNotional(CARRY_NOTIONAL, top.market.info, top.mark);
                const sized = await sizeOrder(ctx.exchange, {
                  market: top.market,
                  account: me,
                  side: top.side,
                  price,
                  wanted,
                  autoPull: false,
                  tradingKey: ctx.tradingKey,
                });

                if (sized.ok) {
                  await placePerp({
                    ctx,
                    market: top.market,
                    side: top.side,
                    price,
                    quantity: sized.quantity,
                    orderType: ORDER_TYPE.MARKET,
                    label: "dreamguard-funding-harvest",
                  });
                } else {
                  console.log(`[Harvester] Sizing skipped: ${sized.reason}`);
                }
              }
            } catch (err) {
              console.error("[Harvester] Placement skipped:", (err as Error).message);
            }
          }
        } else {
          console.log(`[Harvester] Best yield ${(top.apr * 100).toFixed(1)}% is below threshold ${(MIN_FUNDING_APR * 100).toFixed(0)}%. Standing by.`);
        }
      }
    }

    console.log(`\n[DreamGuard] Cycle #${cycle} complete. Sleeping ${POLL_MS / 1000}s...\n`);
    await sleep(POLL_MS, stopped);
  }

  console.log("\n[DreamGuard] Sentinel successfully halted.");
  await shutdown(ctx);
}

main().catch((err) => {
  console.error("[DreamGuard Fatal Error]:", err);
  process.exit(1);
});
