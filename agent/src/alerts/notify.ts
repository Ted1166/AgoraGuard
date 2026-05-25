import Anthropic from "@anthropic-ai/sdk";
import { ALERTS } from "./config.js";
import { makeAlertCalls } from "./call.js";
import { logger } from "../utils/logger.js";
import { AGENT } from "../config.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

export interface AlertResult {
  sent: boolean;
  channels: string[];
  message: string;
  error?: string;
}

let _claude: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!AGENT.anthropicKey) return null;
  if (!_claude) {
    _claude = new Anthropic({ apiKey: AGENT.anthropicKey });
  }
  return _claude;
}

function buildAlertPrompt(verdict: GuardVerdict, decision: TradeDecision): string {
  const urgency = verdict.verdict === "HALT" ? "CRITICAL" : "HIGH";
  return `You are AgoraGuard's alert system. A risk event has been detected on the Arc blockchain testnet.

Alert Level: ${urgency}
Asset: ${verdict.symbol} (${verdict.tokenAddress})
Verdict: ${verdict.verdict}
Guards Triggered: ${verdict.reasons.join(" | ")}
Decision: ${decision.action} (confidence: ${decision.confidence}%)

Risk Metrics:
- Drawdown: ${(verdict.drawdownBps / 100).toFixed(2)}%
- ATR Multiple: ${(verdict.atrMultipleBps / 100).toFixed(2)}x
- RSI: ${verdict.rsi}
- Spread: ${verdict.spreadBps} bps
- Threat Score: ${verdict.threatScore}/100
- Caution Flags Active: ${verdict.cautionCount}

Write a clear, urgent alert message for the wallet owner. Include:
1. What happened and why (plain English summary of the risk)
2. What action the agent took automatically
3. What the user should do next

Keep it under 300 characters. Direct, urgent but calm tone. No markdown.`;
}

export async function sendAlert(
  verdict: GuardVerdict,
  decision: TradeDecision,
): Promise<AlertResult> {
  const client = getClient();
  const message = await generateMessage(client, verdict, decision);
  const channels: string[] = [];

  const divider = "═".repeat(60);
  logger.warn(`\n${divider}`);
  logger.warn(`  🚨 AGORAGUARD RISK ALERT — ${verdict.verdict} — ${verdict.symbol}`);
  logger.warn(`${divider}`);
  for (const line of message.split("\n")) logger.warn(`  ${line}`);
  logger.warn(`${divider}\n`);
  channels.push("console");

  for (const webhook of ALERTS.webhookUrls) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 AgoraGuard ${verdict.verdict}: ${message}`,
          verdict: verdict.verdict,
          symbol: verdict.symbol,
          decision: decision.action,
          metrics: {
            drawdown: +(verdict.drawdownBps / 100).toFixed(2),
            rsi: verdict.rsi,
            threatScore: verdict.threatScore,
            cautionFlags: verdict.cautionCount,
          },
          timestamp: new Date().toISOString(),
        }),
      });
      if (response.ok) channels.push(`webhook:${webhook.slice(0, 30)}...`);
      else logger.warn(`Alerts › webhook returned ${response.status}`);
    } catch (err) {
      logger.warn(`Alerts › webhook failed: ${String(err).slice(0, 80)}`);
    }
  }

  if (ALERTS.twilio.enabled && ALERTS.twilio.toPhones.length > 0) {
    const callResults = await makeAlertCalls(verdict, decision, message);
    const succeeded = callResults.filter(r => r.ok).length;
    const failed    = callResults.filter(r => !r.ok).length;
    if (succeeded > 0) channels.push(`voice:${succeeded}calls`);
    if (failed > 0)    logger.warn(`Alerts › ${failed} voice call(s) failed`);
  }

  logger.info(`Alerts › sent via ${channels.join(", ")} — "${message}"`);
  return { sent: true, channels, message };
}

async function generateMessage(
  client: Anthropic | null,
  verdict: GuardVerdict,
  decision: TradeDecision,
): Promise<string> {
  if (!client) return buildFallbackMessage(verdict, decision);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: buildAlertPrompt(verdict, decision),
      }],
    });

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("").trim();

    return text || buildFallbackMessage(verdict, decision);
  } catch (err) {
    logger.warn("Alerts › Claude message gen failed — using fallback", { error: String(err).slice(0, 120) });
    return buildFallbackMessage(verdict, decision);
  }
}

function buildFallbackMessage(verdict: GuardVerdict, decision: TradeDecision): string {
  const lines: string[] = [];
  lines.push(`${verdict.verdict === "HALT" ? "CRITICAL" : "WARNING"}: ${verdict.symbol} risk event detected.`);
  lines.push(`Verdict: ${verdict.verdict} | Action: ${decision.action}`);
  if (verdict.verdict === "HALT") {
    lines.push("Agent halted all trading. Funds moved to GuardianVault for opted-in wallets.");
  } else {
    lines.push(`Position reduced to ${(verdict.allowedPositionPct * 100).toFixed(1)}% of portfolio.`);
  }
  lines.push(`Drawdown: ${(verdict.drawdownBps / 100).toFixed(2)}% | RSI: ${verdict.rsi} | Threat: ${verdict.threatScore}/100`);
  lines.push(`${verdict.cautionCount} guards triggered: ${verdict.reasons.join(", ")}`);
  return lines.join("\n");
}