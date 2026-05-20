import { getWalletClient, getPublicClient } from "../utils/arc.js";
import { CONTRACTS, VAULT_ABI, PROTECTED_WALLETS } from "../config.js";
import { logger } from "../utils/logger.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

export interface ProtectionResult {
  wallet: string;
  token: string;
  txHash: `0x${string}` | null;
  skipped: boolean;
  reason: string;
}

const ERC20_ABI = [{
  name: "balanceOf", type: "function",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
}] as const;

async function getTokenBalance(
  token: `0x${string}`,
  wallet: `0x${string}`,
): Promise<bigint> {
  try {
    return await getPublicClient().readContract({
      address: token, abi: ERC20_ABI,
      functionName: "balanceOf", args: [wallet],
    }) as bigint;
  } catch {
    return 0n;
  }
}

export async function executeProtection(
  verdict: GuardVerdict,
  decision: TradeDecision,
): Promise<ProtectionResult[]> {
  if (verdict.verdict !== "HALT") return [];

  if (!CONTRACTS.guardianVault) {
    logger.warn("Executor › GUARDIAN_VAULT_ADDRESS not set — skipping");
    return [];
  }

  if (PROTECTED_WALLETS.length === 0) {
    logger.warn("Executor › No PROTECTED_WALLETS configured — skipping");
    return [];
  }

  const results: ProtectionResult[] = [];
  const walletClient = getWalletClient();
  const account = walletClient.account!;
  const client = getPublicClient();
  const reason = decision.reasoning.slice(0, 200);
  const token = verdict.tokenAddress as `0x${string}`;

  for (const userWallet of PROTECTED_WALLETS) {
    try {
      const [isProtected, isCooldown] = await Promise.all([
        client.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "isProtected", args: [userWallet],
        }) as Promise<boolean>,

        client.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "isCooldownActive", args: [userWallet],
        }) as Promise<boolean>,
      ]);

      if (!isProtected) {
        logger.info(`Executor › ${userWallet.slice(0, 8)}... not opted in — skipping`);
        results.push({ wallet: userWallet, token, txHash: null, skipped: true, reason: "Not protected" });
        continue;
      }

      if (isCooldown) {
        logger.info(`Executor › ${userWallet.slice(0, 8)}... cooldown active — skipping`);
        results.push({ wallet: userWallet, token, txHash: null, skipped: true, reason: "Cooldown active" });
        continue;
      }

      const balance = await getTokenBalance(token, userWallet);
      const amount  = balance > 0n ? balance : BigInt(1_000_000);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.guardianVault,
        abi: VAULT_ABI,
        functionName: "protectTokens",
        args: [userWallet, token, amount, reason],
        account,
      }as any);

      logger.info(`Executor › 🛡️  Protected ${userWallet.slice(0, 8)}... amount=${amount} tx=${hash}`);
      results.push({ wallet: userWallet, token, txHash: hash, skipped: false, reason });

    } catch (err) {
      logger.error(`Executor › Protection failed for ${userWallet}`, { error: String(err).slice(0, 200) });
      results.push({ wallet: userWallet, token, txHash: null, skipped: true, reason: String(err).slice(0, 100) });
    }
  }

  return results;
}