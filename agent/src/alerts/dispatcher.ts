import { logger } from "../utils/logger.js";
import { sendAlert } from "./notify.js";
import { ALERTS } from "./config.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

interface AlertRecord {
  symbol: string;
  verdict: "CAUTION" | "HALT";
  timestamp: number;
}

const recentAlerts: Map<string, AlertRecord> = new Map();

function isAlertable(verdict: GuardVerdict): boolean {
  if (verdict.verdict === "HALT") return true;
  if (verdict.verdict === "CAUTION" && verdict.cautionCount >= ALERTS.cautionFlagThreshold) return true;
  return false;
}

function isCoolingDown(symbol: string): boolean {
  const record = recentAlerts.get(symbol);
  if (!record) return false;
  const elapsed = (Date.now() - record.timestamp) / 1000;
  return elapsed < ALERTS.cooldownSecs;
}

export async function dispatchAlert(
  verdict: GuardVerdict,
  decision: TradeDecision,
): Promise<void> {
  if (!isAlertable(verdict)) return;

  if (isCoolingDown(verdict.symbol)) {
    logger.info(`Alerts › ${verdict.symbol} in cooldown — skipping`);
    return;
  }

  recentAlerts.set(verdict.symbol, {
    symbol: verdict.symbol,
    verdict: verdict.verdict as "CAUTION" | "HALT",
    timestamp: Date.now(),
  });

  logger.warn(
    `Alerts › 🚨 ${verdict.verdict} alert triggered for ${verdict.symbol} ` +
    `(flags=${verdict.cautionCount}, drawdown=${(verdict.drawdownBps / 100).toFixed(2)}%, ` +
    `rsi=${verdict.rsi}, threat=${verdict.threatScore})`
  );

  const result = await sendAlert(verdict, decision);

  if (result.sent) {
    logger.info(`Alerts › alert delivered — channels: ${result.channels.join(", ")}`);
  } else {
    logger.error(`Alerts › alert failed — ${result.error}`);
  }
}
