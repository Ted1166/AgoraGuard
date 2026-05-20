import type { GuardVerdict } from "../guards/index.js";
import type { Ticker } from "../monitor/prices.js";
import type { TokenThreat } from "../monitor/threats.js";

export function buildSystemPrompt(): string {
  return `You are AgoraGuard's AI trading brain - an autonomous risk-gated trading agent running on Arc, Circle's stablecoin-native L1.

Your job:
- Read the guard engine output (CLEAR / CAUTION / HALT + detailed metrics)
- Decide: BUY / SELL / HOLD and exactly how much (position size as % of portfolio)
- Set stop-loss (SL) and take-profit (TP) levels
- Give a concise reasoning trace

Rules you MUST follow:
1. NEVER exceed the allowedPositionPct from the guard engine - it's a hard cap
2. If verdict is HALT → always output action: "HOLD", size: 0
3. If verdict is CAUTION → be conservative, lean toward HOLD unless signal is strong
4. If verdict is CLEAR → you may trade, but still apply your own judgment
5. Your reasoning trace is published onchain — be precise and honest
6. Prefer HOLD when uncertain - "not losing" is the primary objective

Output ONLY valid JSON, no markdown, no explanation outside the JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "sizePct": <number 0-20>,
  "stopLossPct": <number, e.g. 2.5 means 2.5% below entry>,
  "takeProfitPct": <number or null>,
  "confidence": <number 0-100>,
  "reasoning": "<concise explanation, max 200 chars>"
}`;
}

export function buildUserMessage(
  verdict: GuardVerdict,
  ticker: Ticker,
  threat: TokenThreat | undefined,
): string {
  return JSON.stringify({
    symbol: verdict.symbol,
    price: ticker.price,
    change24h: ticker.change24h,
    volume24h: ticker.volume24h,
    verdict: verdict.verdict,
    allowedPositionPct: +(verdict.allowedPositionPct * 100).toFixed(2),
    guards: {
      drawdownPct: +(verdict.drawdownBps / 100).toFixed(2),
      atrMultiple: +(verdict.atrMultipleBps / 100).toFixed(2),
      rsi: verdict.rsi,
      spreadBps: verdict.spreadBps,
      threatScore: verdict.threatScore,
      cautionFlags: verdict.cautionFlags,
      cautionCount: verdict.cautionCount,
    },
    threat: threat ? {
      isHoneypot: threat.isHoneypot,
      cannotSell: threat.cannotSell,
      recommendation: threat.recommendation,
      flags: threat.rawFlags,
    } : null,
    guardReasons: verdict.reasons,
  }, null, 2);
}