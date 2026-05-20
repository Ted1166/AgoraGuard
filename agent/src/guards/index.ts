import { checkDrawdown } from "./drawdown.js";
import { checkVolatility } from "./volatility.js";
import { checkRSI } from "./rsi.js";
import { checkSpread } from "./spread.js";
import { checkCooldown } from "./cooldown.js";
import { RISK } from "../config.js";
import { logger } from "../utils/logger.js";
import type { Ticker, Candle } from "../monitor/prices.js";
import type { TokenThreat } from "../monitor/threats.js";
import type { ChainState } from "../monitor/chain.js";

export type Verdict = "CLEAR" | "CAUTION" | "HALT";

export const CautionFlag = {
  DRAWDOWN: 1 << 0,
  VOLATILITY: 1 << 1,
  RSI: 1 << 2,
  SPREAD: 1 << 3,
  COOLDOWN: 1 << 4,
  THREAT: 1 << 5,
} as const;

export interface GuardVerdict {
  symbol: string;
  tokenAddress: string;
  verdict: Verdict;
  verdictCode: 0 | 1 | 2;
  cautionFlags: number;
  cautionCount: number;
  allowedPositionPct: number;

  drawdownBps: number;
  atrMultipleBps: number;
  rsi: number;
  spreadBps: number;
  threatScore: number;

  reasons: string[];
  summary: string;
}

export function runGuards(
  symbol: string,
  tokenAddress: string,
  ticker: Ticker,
  candles: Candle[],
  threat: TokenThreat | undefined,
  chain: ChainState,
): GuardVerdict {

  let isHalt = false;
  let cautionFlags = 0;
  const reasons: string[] = [];

  const cooldown = checkCooldown(symbol);
  if (cooldown.isCooldownActive) {
    cautionFlags |= CautionFlag.COOLDOWN;
    reasons.push(`[COOLDOWN] ${cooldown.reason}`);
  }

  const drawdown = checkDrawdown(symbol, ticker.price);
  if (drawdown.isHalt) {
    isHalt = true;
    reasons.push(`[HALT-DRAWDOWN] ${drawdown.reason}`);
  } else if (drawdown.isCaution) {
    cautionFlags |= CautionFlag.DRAWDOWN;
    reasons.push(`[CAUTION-DRAWDOWN] ${drawdown.reason}`);
  }

  const volatility = checkVolatility(candles);
  if (volatility.isHalt) {
    isHalt = true;
    reasons.push(`[HALT-VOLATILITY] ${volatility.reason}`);
  } else if (volatility.isCaution) {
    cautionFlags |= CautionFlag.VOLATILITY;
    reasons.push(`[CAUTION-VOLATILITY] ${volatility.reason}`);
  }

  const rsi = checkRSI(candles);
  if (rsi.isCaution) {
    cautionFlags |= CautionFlag.RSI;
    reasons.push(`[CAUTION-RSI] ${rsi.reason}`);
  }

  const spread = checkSpread(ticker);
  if (spread.isHalt) {
    isHalt = true;
    reasons.push(`[HALT-SPREAD] ${spread.reason}`);
  } else if (spread.isCaution) {
    cautionFlags |= CautionFlag.SPREAD;
    reasons.push(`[CAUTION-SPREAD] ${spread.reason}`);
  }

  const onchainThreatScore = chain.threatScores[tokenAddress] ?? 0;
  const goplusThreatScore  = threat?.goplusScore ?? 0;
  const combinedThreat = Math.max(onchainThreatScore, goplusThreatScore);

  if (combinedThreat >= RISK.threatScoreHaltThreshold || threat?.isHoneypot || threat?.cannotSell) {
    isHalt = true;
    reasons.push(`[HALT-THREAT] Threat score ${combinedThreat}/100 — ${threat?.rawFlags.join(",") ?? "onchain registry"}`);
  } else if (combinedThreat >= RISK.threatScoreCautionThreshold) {
    cautionFlags |= CautionFlag.THREAT;
    reasons.push(`[CAUTION-THREAT] Threat score ${combinedThreat}/100`);
  }

  const verdict: Verdict =
    isHalt ? "HALT"    :
    cautionFlags > 0 ? "CAUTION" : "CLEAR";

  const verdictCode = verdict === "HALT" ? 2 : verdict === "CAUTION" ? 1 : 0;
  const cautionCount = countBits(cautionFlags);

  const allowedPositionPct = verdict === "HALT"
    ? 0
    : RISK.maxPositionPct * Math.pow(RISK.cautionSizeMultiplier, cautionCount);

  if (reasons.length === 0) reasons.push("All guards pass — CLEAR");

  const summary =
    `${symbol} → ${verdict} | ` +
    `drawdown=${(drawdown.drawdownPct * 100).toFixed(2)}% ` +
    `atr=${volatility.atrMultiple.toFixed(2)}× ` +
    `rsi=${rsi.rsi} ` +
    `spread=${spread.spreadBps}bps ` +
    `threat=${combinedThreat} ` +
    `pos=${(allowedPositionPct * 100).toFixed(1)}%`;

  logger.info(`Guards › ${summary}`);
  if (verdict !== "CLEAR") {
    reasons.forEach(r => logger.warn(`Guards › ${r}`));
  }

  return {
    symbol,
    tokenAddress,
    verdict,
    verdictCode: verdictCode as 0 | 1 | 2,
    cautionFlags,
    cautionCount,
    allowedPositionPct,
    drawdownBps: drawdown.drawdownBps,
    atrMultipleBps: volatility.atrMultipleBps,
    rsi: rsi.rsi,
    spreadBps: spread.spreadBps,
    threatScore: combinedThreat,
    reasons,
    summary,
  };
}

function countBits(n: number): number {
  let count = 0;
  while (n) { count += n & 1; n >>= 1; }
  return count;
}