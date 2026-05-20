import { getWalletClient, getPublicClient } from "../utils/arc.js";
import { ARC } from "../config.js";
import { logger } from "../utils/logger.js";

const IDENTITY_ABI = [
  {
    name: "registerAgent",
    type: "function",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "url", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "isRegistered",
    type: "function",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

export async function registerAgentIdentity(): Promise<void> {
  const wallet = getWalletClient();
  const account = wallet.account!;
  const client = getPublicClient();

  logger.info(`Identity › Registering agent ${account.address.slice(0, 10)}... on ERC-8004`);

  try {
    let already = false;
    try {
      already = await client.readContract({
        address: ARC.identity.identityRegistry,
        abi: IDENTITY_ABI,
        functionName: "isRegistered",
        args: [account.address],
      }) as boolean;
    } catch {
      logger.info("Identity › isRegistered check failed — attempting registration anyway");
    }

    if (already) {
      logger.info("Identity › Already registered on ERC-8004 ✓");
      return;
    }

    const hash = await wallet.writeContract({
      address: ARC.identity.identityRegistry,
      abi: IDENTITY_ABI,
      functionName: "registerAgent",
      args: [
        "AgoraGuard",
        "Autonomous risk-gated trading agent — 5-guard engine + Claude AI on Arc",
        "https://github.com/Ted1166/AgoraGuard",
      ],
      account,
    }as any);

    logger.info(`Identity › ERC-8004 registered ✓  tx=${hash}`);

  } catch (err) {
    logger.warn("Identity › Registration skipped (non-fatal)", { error: String(err).slice(0, 120) });
  }
}