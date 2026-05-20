import { getWalletClient, publicClient } from "../utils/arc.js";
import { CONTRACTS, ORACLE_ABI } from "../config.js";
import { logger } from "../utils/logger.js";
import type { GuardVerdict } from "../guards/index.js";

export async function writeVerdictOnchain(
  verdict: GuardVerdict,
): Promise<`0x${string}` | null> {
  if (!CONTRACTS.riskGuardOracle) {
    logger.warn("Executor › RISK_GUARD_ORACLE_ADDRESS not set - skipping onchain write");
    return null;
  }

  try {
    const wallet = getWalletClient();
    const account = wallet.account!;

    const summary = verdict.summary.slice(0, 200);

    const hash = await wallet.writeContract({
      address: CONTRACTS.riskGuardOracle,
      abi: ORACLE_ABI,
      functionName: "recordVerdict",
      args: [
        verdict.tokenAddress as `0x${string}`,
        verdict.verdictCode,
        verdict.cautionFlags,
        verdict.drawdownBps,
        verdict.atrMultipleBps,
        verdict.rsi,
        verdict.spreadBps,
        summary,
      ],
      account,
    }as any);

    logger.info(`Executor › RiskGuardOracle verdict recorded: ${hash}`);
    return hash;

  } catch (err) {
    logger.error("Executor › Failed to write verdict onchain", { error: String(err) });
    return null;
  }
}