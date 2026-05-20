import Anthropic from "@anthropic-ai/sdk";
import { AGENT } from "../config.js";
import { logger } from "../utils/logger.js";
import { buildSystemPrompt, buildUserMessage } from "./prompt.js";
import type { GuardVerdict } from "../guards/index.js";
import type { Ticker } from "../monitor/prices.js";
import type { TokenThreat } from "../monitor/threats.js";
import { computeRSI } from "../guards/rsi.js";
import type { Candle } from "../monitor/prices.js";

export type TradeAction = "BUY" | "SELL" | "HOLD";

export interface TradeDecision {
  action: TradeAction;
  sizePct: number;
  stopLossPct: number;
  takeProfitPct: number | null;
  confidence: number;
  reasoning: string;
  source: "claude" | "rule-based";
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: AGENT.anthropicKey });
  }
  return _client;
}

function ruleBasedDecision(
  verdict: GuardVerdict,
  candles: Candle[],
): TradeDecision {
  if (verdict.verdict === "HALT") {
    return {
      action: "HOLD", sizePct: 0, stopLossPct: 3, takeProfitPct: null,
      confidence: 100,
      reasoning: `Rule-based: HALT verdict - no new entries`,
      source: "rule-based",
    };
  }

  const rsi = verdict.rsi;
  const sizePct = +(verdict.allowedPositionPct * 100).toFixed(2);
  const isCaution = verdict.verdict === "CAUTION";

  // RSI + momentum rules
  if (rsi < 35 && !isCaution) {
    return {
      action: "BUY", sizePct: sizePct * 0.5,
      stopLossPct: 3, takeProfitPct: 6,
      confidence: 60,
      reasoning: `Rule-based: RSI ${rsi} oversold — small long`,
      source: "rule-based",
    };
  }

  if (rsi > 68) {
    return {
      action: "SELL", sizePct: sizePct * 0.5,
      stopLossPct: 3, takeProfitPct: null,
      confidence: 55,
      reasoning: `Rule-based: RSI ${rsi} overbought — reduce exposure`,
      source: "rule-based",
    };
  }

  return {
    action: "HOLD", sizePct: 0,
    stopLossPct: 3, takeProfitPct: null,
    confidence: 50,
    reasoning: `Rule-based: no strong signal — holding`,
    source: "rule-based",
  };
}

async function claudeDecision(
  verdict: GuardVerdict,
  ticker: Ticker,
  threat: TokenThreat | undefined,
): Promise<TradeDecision> {
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: buildSystemPrompt(),
    messages: [{
      role: "user",
      content: buildUserMessage(verdict, ticker, threat),
    }],
  });

  const raw = message.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("");

  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as {
    action: TradeAction;
    sizePct: number;
    stopLossPct: number;
    takeProfitPct: number | null;
    confidence: number;
    reasoning: string;
  };

  if (verdict.verdict === "HALT") {
    parsed.action  = "HOLD";
    parsed.sizePct = 0;
  }

  parsed.sizePct = Math.min(parsed.sizePct, verdict.allowedPositionPct * 100);

  return { ...parsed, source: "claude" };
}

export async function decide(
  verdict: GuardVerdict,
  ticker: Ticker,
  candles: Candle[],
  threat: TokenThreat | undefined,
): Promise<TradeDecision> {

  logger.info(`Brain › deciding for ${verdict.symbol} (verdict=${verdict.verdict})`);

  if (!AGENT.aiEnabled || !AGENT.anthropicKey) {
    logger.info("Brain › AI disabled — using rule-based fallback");
    return ruleBasedDecision(verdict, candles);
  }

  try {
    const decision = await claudeDecision(verdict, ticker, threat);
    logger.info(
      `Brain › Claude → ${decision.action} ` +
      `size=${decision.sizePct.toFixed(2)}% ` +
      `confidence=${decision.confidence} ` +
      `reason="${decision.reasoning}"`
    );
    return decision;
  } catch (err) {
    logger.warn("Brain › Claude failed — falling back to rules", { error: String(err) });
    return ruleBasedDecision(verdict, candles);
  }
}