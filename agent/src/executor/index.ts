import { writeVerdictOnchain } from "./oracle.js";
import { executeProtection }  from "./vault.js";
import { dispatchAlert } from "../alerts/index.js";
import { ALERTS } from "../alerts/index.js";
import { logger } from "../utils/logger.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

export interface ExecutionResult {
  oracleTx: `0x${string}` | null;
  protections: Awaited<ReturnType<typeof executeProtection>>;
  timestamp: number;
}

export async function execute(
  verdict: GuardVerdict,
  decision: TradeDecision,
): Promise<ExecutionResult> {
  logger.info(
    `Executor › ${verdict.symbol} ${verdict.verdict} → ` +
    `${decision.action} ${decision.sizePct.toFixed(2)}% | ${decision.reasoning}`
  );

  const oracleTx = await writeVerdictOnchain(verdict);

  if (ALERTS.enabled) {
    await dispatchAlert(verdict, decision);
  }

  const protections = await executeProtection(verdict, decision);

  if (verdict.verdict === "HALT") {
    logger.warn(
      `Executor › 🚨 HALT executed - ${protections.filter(p => !p.skipped).length} wallets protected`
    );
  }

  return { oracleTx, protections, timestamp: Date.now() };
}

export { registerAgentIdentity } from "./identity.js";