import { fetchMarketSnapshot, type MarketSnapshot } from "./prices.js";
import { fetchAllThreats, type TokenThreat } from "./threats.js";
import { fetchChainState, type ChainState } from "./chain.js";
import { MONITORED_TOKENS } from "../config.js";
import { logger } from "../utils/logger.js";

export interface AgentSnapshot {
  market: MarketSnapshot;
  threats: Record<string, TokenThreat>;
  chain: ChainState;
  fetchedAt: number;
}

export async function collectSnapshot(): Promise<AgentSnapshot> {
  logger.info("═══ Monitor cycle starting ═══");

  const [market, threats, chain] = await Promise.allSettled([
    fetchMarketSnapshot(),
    fetchAllThreats(MONITORED_TOKENS as unknown as string[]),
    fetchChainState(),
  ]);

  if (market.status  === "rejected") throw new Error(`Market fetch failed: ${market.reason}`);
  if (threats.status === "rejected") logger.warn("Threat fetch failed - continuing", { error: threats.reason });
  if (chain.status   === "rejected") logger.warn("Chain fetch failed - continuing", { error: chain.reason  });

  return {
    market: market.value,
    threats: threats.status === "fulfilled" ? threats.value : {},
    chain: chain.status === "fulfilled" ? chain.value   : {
      blockNumber: 0n,
      wallets: {},
      threatScores: {},
      verifiedThreats: [],
      fetchedAt: Date.now(),
    },
    fetchedAt: Date.now(),
  };
}

export type { MarketSnapshot, TokenThreat, ChainState };