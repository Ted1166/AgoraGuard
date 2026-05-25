/**
 * agent/src/index.ts — main entry point
 * Starts HTTP server + agent cycle loop
 */
import "dotenv/config";
import { collectSnapshot }                  from "./monitor/index.js";
import { runGuards }                        from "./guards/index.js";
import { decide }                           from "./brain/index.js";
import { execute, registerAgentIdentity }   from "./executor/index.js";
import { sendAlert }                        from "./alerts/notify.js";
import { startServer }                      from "./server.js";
import { AGENT, ASSET_MAP }                 from "./config.js";
import { logger }                           from "./utils/logger.js";

let cycleCount = 0;

async function runCycle(): Promise<void> {
  cycleCount++;
  const start = Date.now();
  logger.info(`\n${"═".repeat(60)}`);
  logger.info(`AgoraGuard cycle #${cycleCount} starting...`);

  try {
    const snapshot = await collectSnapshot();

    for (const [symbol, tokenAddress] of Object.entries(ASSET_MAP)) {
      const ticker  = snapshot.market.tickers[symbol];
      const candles = snapshot.market.candles[symbol];
      if (!ticker || !candles?.length) {
        logger.warn(`Cycle › no market data for ${symbol} — skipping`);
        continue;
      }

      const threat  = snapshot.threats[tokenAddress];
      const verdict = runGuards(symbol, tokenAddress, ticker, candles, threat, snapshot.chain);
      const decision = await decide(verdict, ticker, candles, threat);
      const result   = await execute(verdict, decision);

      // Fire alerts on HALT or CAUTION
      if (verdict.verdict === "HALT" || verdict.verdict === "CAUTION") {
        await sendAlert(verdict, decision);
      }

      logger.info(
        `Cycle › ${symbol} done | oracle=${result.oracleTx?.slice(0, 10) ?? "skip"} ` +
        `protections=${result.protections.length}`
      );
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    logger.info(`AgoraGuard cycle #${cycleCount} complete in ${elapsed}s`);

  } catch (err) {
    logger.error(`Cycle #${cycleCount} error`, { error: String(err) });
  }
}

async function main(): Promise<void> {
  logger.info("╔══════════════════════════════════════════════╗");
  logger.info("║           AgoraGuard Agent starting          ║");
  logger.info("║   Risk-gated AI trading agent on Arc         ║");
  logger.info("╚══════════════════════════════════════════════╝");
  logger.info(`Cycle interval : ${AGENT.cycleIntervalSecs}s`);
  logger.info(`AI enabled     : ${AGENT.aiEnabled}`);
  logger.info(`Assets         : ${Object.keys(ASSET_MAP).join(", ")}`);

  // Start HTTP server (for health checks + test-alert button)
  startServer();

  // Register ERC-8004 identity on Arc
  await registerAgentIdentity();

  // Graceful shutdown
  process.on("SIGINT",  () => { logger.info("Shutting down..."); process.exit(0); });
  process.on("SIGTERM", () => { logger.info("Shutting down..."); process.exit(0); });

  // Run first cycle immediately then on interval
  await runCycle();
  setInterval(runCycle, AGENT.cycleIntervalSecs * 1_000);
}

main().catch(err => {
  logger.error("Fatal startup error", { error: String(err) });
  process.exit(1);
});