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

const GOPLUS_CHAIN = "56";

interface GoPlusTokenResult {
  is_honeypot?: string;
  is_blacklisted?: string;
  is_mintable?: string;
  is_open_source?: string;
  can_take_back_ownership?: string;
  buy_tax?: string;
  sell_tax?: string;
  slippage_modifiable?: string;
  is_anti_whale?: string;
  trading_cooldown?: string;
  owner_change_balance?: string;
  cannot_buy?: string;
  cannot_sell_all?: string;
  transfer_pausable?: string;
}

async function queryGoPlus(
  tokenAddress: string
): Promise<GoPlusTokenResult | null> {
  try {
    const url = `${GOPLUS_BASE}/token_security/${GOPLUS_CHAIN}?contract_addresses=${tokenAddress}`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (AGENT.goplusKey) {
      headers["Authorization"] = `Bearer ${AGENT.goplusKey}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      logger.warn(`GoPlus HTTP ${res.status} for ${tokenAddress}`);
      return null;
    }

    const data = await res.json() as {
      code: number;
      message: string;
      result: Record<string, GoPlusTokenResult>;
    };

    if (data.code !== 1) {
      logger.warn(`GoPlus error ${data.code}: ${data.message}`);
      return null;
    }

    return data.result[tokenAddress.toLowerCase()] ?? null;

  } catch (err) {
    logger.warn("GoPlus fetch failed", { error: String(err) });
    return null;
  }
}

function deriveScore(r: GoPlusTokenResult): {
  score: number;
  flags: string[];
} {
  const flags: string[] = [];
  let score = 0;

  if (r.is_honeypot === "1") { score += 40; flags.push("honeypot");         }
  if (r.cannot_sell_all === "1") { score += 30; flags.push("cannot-sell");       }
  if (r.is_blacklisted === "1") { score += 20; flags.push("blacklist-function");}
  if (r.is_mintable === "1") { score += 15; flags.push("mintable");          }
  if (r.can_take_back_ownership === "1") { score += 15; flags.push("ownership-change"); }
  if (r.transfer_pausable === "1") { score += 10; flags.push("transfer-pausable"); }
  if (r.owner_change_balance === "1") { score += 10; flags.push("owner-change-balance"); }
  if (r.slippage_modifiable === "1") { score += 10; flags.push("modifiable-slippage"); }

  const buyTax  = parseFloat(r.buy_tax  ?? "0");
  const sellTax = parseFloat(r.sell_tax ?? "0");
  if (buyTax  > 0.10) { score += 10; flags.push(`buy-tax-${(buyTax*100).toFixed(0)}%`);  }
  if (sellTax > 0.10) { score += 10; flags.push(`sell-tax-${(sellTax*100).toFixed(0)}%`); }

  return { score: Math.min(score, 100), flags };
}

export async function fetchTokenThreat(
  tokenAddress: string
): Promise<TokenThreat> {
  logger.info(`Monitor › GoPlus threat check for ${tokenAddress}`);

  const raw = await queryGoPlus(tokenAddress);

  if (!raw) {
    logger.info(`Monitor › GoPlus: no data for ${tokenAddress} — baseline safe`);
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

  const { score, flags } = deriveScore(raw);

  const recommendation =
    score >= RISK.goplusHaltThreshold    ? "HALT"    :
    score >= RISK.threatScoreCautionThreshold ? "CAUTION" : "SAFE";

  const threat: TokenThreat = {
    address: tokenAddress,
    goplusScore: score,
    isHoneypot: raw.is_honeypot     === "1",
    isMalicious: score               >= 60,
    cannotSell: raw.cannot_sell_all === "1",
    hasBlacklist: raw.is_blacklisted  === "1",
    hasMintFunction: raw.is_mintable     === "1",
    ownerCanChange: raw.can_take_back_ownership === "1",
    taxBuyPct: parseFloat(raw.buy_tax  ?? "0") * 100,
    taxSellPct: parseFloat(raw.sell_tax ?? "0") * 100,
    recommendation,
    rawFlags: flags,
    fetchedAt: Date.now(),
  };

  logger.info(
    `Monitor › GoPlus ${tokenAddress.slice(0, 8)}... ` +
    `score=${score} recommendation=${recommendation} flags=[${flags.join(",")}]`
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