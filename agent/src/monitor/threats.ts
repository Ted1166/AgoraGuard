import { AGENT, RISK } from "../config.js";
import { logger } from "../utils/logger.js";

export interface TokenThreat {
  address: string;
  goplusScore: number;
  isHoneypot: boolean;
  isMalicious: boolean;
  cannotSell: boolean;
  hasBlacklist: boolean;
  hasMintFunction: boolean;
  ownerCanChange: boolean;
  taxBuyPct: number;
  taxSellPct: number;
  recommendation: "SAFE" | "CAUTION" | "HALT";
  rawFlags: string[];
  fetchedAt: number;
}

const GOPLUS_BASE = "https://api.gopluslabs.io/api/v1";

const KNOWN_SAFE_ADDRESSES = new Set([
  "0x3600000000000000000000000000000000000000",
  "0x89b50855aa3be2f677cd6303cec089b5f319d72a",
  "0xe9185f0c5f296ed1797aae4238d26ccabeadb86c",
]);

function baselineSafe(tokenAddress: string): TokenThreat {
  return {
    address: tokenAddress,
    goplusScore: 0,
    isHoneypot: false,
    isMalicious: false,
    cannotSell: false,
    hasBlacklist: false,
    hasMintFunction: false,
    ownerCanChange: false,
    taxBuyPct: 0,
    taxSellPct: 0,
    recommendation: "SAFE",
    rawFlags: [],
    fetchedAt: Date.now(),
  };
}

async function checkMaliciousAddress(address: string): Promise<{
  isMalicious: boolean;
  tags: string[];
}> {
  try {
    const url = `${GOPLUS_BASE}/address_security/${address}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (AGENT.goplusKey && AGENT.goplusKey !== "YOUR_GOPLUS_KEY_HERE") {
      headers["Authorization"] = `Bearer ${AGENT.goplusKey}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      logger.warn(`GoPlus malicious-address HTTP ${res.status} for ${address}`);
      return { isMalicious: false, tags: [] };
    }

    const data = await res.json() as {
      code: number;
      message: string;
      result: {
        malicious_address?: string;
        malicious_behavior?: string[];
        tags?: string[];
      };
    };

    if (data.code !== 1) {
      logger.warn(`GoPlus address-security error ${data.code}: ${data.message}`);
      return { isMalicious: false, tags: [] };
    }

    const result = data.result ?? {};
    const isMalicious = result.malicious_address === "1";
    const tags = [
      ...(result.malicious_behavior ?? []),
      ...(result.tags ?? []),
    ];

    return { isMalicious, tags };
  } catch (err) {
    logger.warn("GoPlus address-security fetch failed", { error: String(err) });
    return { isMalicious: false, tags: [] };
  }
}

export async function fetchTokenThreat(
  tokenAddress: string
): Promise<TokenThreat> {
  logger.info(`Monitor › GoPlus threat check for ${tokenAddress}`);

  if (KNOWN_SAFE_ADDRESSES.has(tokenAddress.toLowerCase())) {
    logger.info(`Monitor › ${tokenAddress.slice(0, 10)}... is a Circle-issued token - baseline safe`);
    return baselineSafe(tokenAddress);
  }

  const { isMalicious, tags } = await checkMaliciousAddress(tokenAddress);

  const score = isMalicious ? 85 : 0;
  const recommendation: "SAFE" | "CAUTION" | "HALT" =
    score >= RISK.goplusHaltThreshold         ? "HALT"    :
    score >= RISK.threatScoreCautionThreshold ? "CAUTION" : "SAFE";

  const threat: TokenThreat = {
    address: tokenAddress,
    goplusScore: score,
    isHoneypot: false,
    isMalicious,
    cannotSell: false,
    hasBlacklist: false,
    hasMintFunction: false,
    ownerCanChange: false,
    taxBuyPct: 0,
    taxSellPct: 0,
    recommendation,
    rawFlags: tags,
    fetchedAt: Date.now(),
  };

  logger.info(
    `Monitor › GoPlus ${tokenAddress.slice(0, 10)}... ` +
    `malicious=${isMalicious} recommendation=${recommendation}` +
    (tags.length ? ` tags=[${tags.join(",")}]` : "")
  );

  return threat;
}

export async function fetchAllThreats(
  addresses: string[]
): Promise<Record<string, TokenThreat>> {
  const results = await Promise.allSettled(
    addresses.map(addr => fetchTokenThreat(addr))
  );

  const threats: Record<string, TokenThreat> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      threats[result.value.address] = result.value;
    }
  }
  return threats;
}