import {
  createExchange,
  healthRatio,
  linkCoverage,
  liveFunding,
  liveMark,
  loadEnv,
  marginSnapshot,
  markOf,
  perpMarkets,
  shutdown,
  type PerpMarket,
} from "@dreamdex-bot-kit/perp-core";
import { formatUnits } from "viem";

loadEnv();

async function main() {
  const ctx = createExchange({ withSigner: false });
  const me = ctx.exchange.walletAddress as `0x${string}`;

  console.log("\n================================================================================");
  console.log("       🛡️  DREAMGUARD SYSTEM TELEMETRY & ON-CHAIN RISK DASHBOARD");
  console.log("================================================================================");
  console.log(`Smart Account   : ${me}`);
  console.log(`Operator Key    : ${ctx.tradingKey?.operator ?? "Not configured"}`);
  console.log(`Network         : Somnia Tokyo/Hideki Testnet (Chain ID 50383)`);
  console.log(`RPC             : ${ctx.config.rpcUrl}`);
  console.log(`Indexer         : ${ctx.config.indexerUrl}`);

  const markets = await perpMarkets(ctx.exchange, true);
  if (ctx.tradingKey) {
    const { linked } = await linkCoverage(ctx, markets);
    console.log(`Operator Link   : Authorized on ${linked.length}/${markets.length} perp markets`);
  }

  // Margin Snapshot
  const snap = await marginSnapshot(ctx.exchange, markets[0], me);
  const health = healthRatio(snap);
  const equity = Number(formatUnits(snap.equity, 18)).toFixed(2);
  const unlocked = Number(formatUnits(snap.unlocked, 18)).toFixed(2);
  const locked = Number(formatUnits(snap.locked, 18)).toFixed(2);

  console.log("\n--- ACCOUNT MARGIN & HEALTH ---");
  console.log(`Equity          : ${equity} USDso`);
  console.log(`Unlocked Margin : ${unlocked} USDso`);
  console.log(`Locked Margin   : ${locked} USDso`);
  console.log(`Health Factor   : ${Number.isFinite(health) ? health.toFixed(2) + "x" : "∞ (No open debt/exposure)"}`);
  console.log(`Account Status  : ${snap.status}`);

  // Positions
  const positions = await ctx.exchange.fetchPositions();
  console.log("\n--- OPEN PERP EXPOSURES ---");
  if (positions.length === 0) {
    console.log("None (Portfolio is Flat)");
  } else {
    for (const p of positions) {
      console.log(`• ${p.symbol}: ${p.side.toUpperCase()} ${p.contracts} | Entry: ${p.entryPrice.toFixed(2)} | uPnL: ${p.unrealizedPnl?.toFixed(4) ?? "0"} USDso`);
    }
  }

  // Funding Scan
  console.log("\n--- TOP FUNDING YIELD OPPORTUNITIES (ANNUALIZED APR) ---");
  const opps = [];
  for (const m of markets) {
    try {
      const f = await liveFunding(ctx.exchange, m);
      if (!f) continue;
      const mark = (await liveMark(ctx.exchange, m)) ?? markOf(m.info);
      opps.push({
        display: m.display,
        apr: f.apr,
        earns: f.apr >= 0 ? "SHORT" : "LONG",
        mark,
      });
    } catch {
      // skip
    }
  }

  opps.sort((a, b) => Math.abs(b.apr) - Math.abs(a.apr));
  console.log("Symbol          Mark Price       Funding APR      Yield Earning Side");
  console.log("----------------------------------------------------------------------");
  for (const o of opps.slice(0, 8)) {
    const name = o.display.padEnd(16);
    const px = ("$" + (o.mark >= 1 ? o.mark.toFixed(2) : o.mark.toPrecision(4))).padEnd(17);
    const apr = ((Math.abs(o.apr) * 100).toFixed(2) + "%").padEnd(17);
    console.log(`${name}${px}${apr}${o.earns}`);
  }

  console.log("\n--- ON-CHAIN AUDIT TRAIL (PROOF OF BUILDING) ---");
  console.log("• Open Position Tx : 0x602235a67a9363cf5156485bfc59d1d70de53286f50fb925ad5369049b9c7867");
  console.log("• Close Position Tx: 0x68c772d91fbe5e6d7e107bd2e857c31cc78a6c78c5696b9ffc27acddafeb0621");
  console.log("• Smart Account    : 0xEe88c3D95B2F6D35b143bF78316821016a291785");
  console.log("• Operator Bot Key : 0x8c7e9D491ce0fDF987034aE22cEAC6f65C709306");
  console.log("================================================================================\n");

  await shutdown(ctx);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
