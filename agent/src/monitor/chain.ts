import { getPublicClient, getUSDCBalance } from "../utils/arc.js";
import { CONTRACTS, MONITORED_TOKENS, PROTECTED_WALLETS, VAULT_ABI, THREAT_ABI } from "../config.js";
import { logger } from "../utils/logger.js";

export interface WalletState {
  address: string;
  usdcBalance: bigint;
  isProtected: boolean;
  isCooldownActive: boolean;
}

export interface ChainState {
  blockNumber: bigint;
  wallets: Record<string, WalletState>;
  threatScores: Record<string, number>;
  verifiedThreats: string[];
  fetchedAt: number;
}

async function readWalletState(address: `0x${string}`): Promise<WalletState> {
  const client = getPublicClient();

  const [usdcBalance, isProtected, isCooldownActive] = await Promise.all([
    getUSDCBalance(address),

    CONTRACTS.guardianVault
      ? (client.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "isProtected", args: [address],
        }) as Promise<boolean>).catch(() => false)
      : Promise.resolve(false),

    CONTRACTS.guardianVault
      ? (client.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "isCooldownActive", args: [address],
        }) as Promise<boolean>).catch(() => false)
      : Promise.resolve(false),
  ]);

  return { address, usdcBalance, isProtected, isCooldownActive };
}

async function readThreatScore(token: `0x${string}`): Promise<number> {
  if (!CONTRACTS.threatRegistry) return 0;
  try {
    const score = await getPublicClient().readContract({
      address: CONTRACTS.threatRegistry, abi: THREAT_ABI,
      functionName: "getAggregateThreatScore", args: [token],
    }) as number;
    return score;
  } catch { return 0; }
}

async function checkVerifiedThreat(token: `0x${string}`): Promise<boolean> {
  if (!CONTRACTS.threatRegistry) return false;
  try {
    return await getPublicClient().readContract({
      address: CONTRACTS.threatRegistry, abi: THREAT_ABI,
      functionName: "isVerifiedThreat", args: [token],
    }) as boolean;
  } catch { return false; }
}

export async function fetchChainState(): Promise<ChainState> {
  logger.info("Monitor › reading Arc chain state...");

  const client = getPublicClient();

  const [blockNumberResult, ...walletResults] = await Promise.allSettled([
    client.getBlockNumber(),
    ...PROTECTED_WALLETS.map(w => readWalletState(w)),
  ]);

  const blockNumber = blockNumberResult.status === "fulfilled"
    ? blockNumberResult.value as bigint
    : 0n;

  const wallets: Record<string, WalletState> = {};
  for (const r of walletResults) {
    if (r.status === "fulfilled") {
      const w = r.value as WalletState;
      wallets[w.address] = w;
    }
  }

  const threatResults = await Promise.allSettled(
    MONITORED_TOKENS.map(async (token) => ({
      token,
      score:    await readThreatScore(token),
      verified: await checkVerifiedThreat(token),
    }))
  );

  const threatScores: Record<string, number> = {};
  const verifiedThreats: string[] = [];

  for (const r of threatResults) {
    if (r.status === "fulfilled") {
      threatScores[r.value.token] = r.value.score;
      if (r.value.verified) verifiedThreats.push(r.value.token);
    }
  }

  logger.info(
    `Monitor › block=${blockNumber} wallets=${Object.keys(wallets).length} ` +
    `verifiedThreats=${verifiedThreats.length}`
  );

  return { blockNumber, wallets, threatScores, verifiedThreats, fetchedAt: Date.now() };
}