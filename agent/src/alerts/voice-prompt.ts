import Anthropic from "@anthropic-ai/sdk";
import { AGENT } from "../config.js";
import { logger } from "../utils/logger.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

let _claude: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!AGENT.anthropicKey) return null;
  if (!_claude) {
    _claude = new Anthropic({ apiKey: AGENT.anthropicKey });
  }
  return _claude;
}

function buildVoicePrompt(verdict: GuardVerdict, decision: TradeDecision, textMessage: string): string {
  const urgency = verdict.verdict === "HALT" ? "critical" : "high";
  return `Convert this risk alert into a short spoken phone message. The user will hear this as a voice call from AgoraGuard, their automated trading protection agent.

Alert details:
- Urgency: ${urgency}
- Asset: ${verdict.symbol}
- Verdict: ${verdict.verdict}
- Action taken: ${decision.action}
- Written message: "${textMessage}"

Rules for the spoken message:
- Start with "This is AgoraGuard with a ${urgency === "critical" ? "critical" : "risk"} alert"
- Explain what happened in one short sentence
- Say what action was taken automatically
- End with what the user should do (or that no action is needed)
- Keep it under 60 words total — it will be read aloud by text-to-speech
- Use short, clear sentences suitable for speech
- No emojis, no markdown, no special characters
- Sound calm and professional`;
}

export async function getVoiceMessage(
  verdict: GuardVerdict,
  decision: TradeDecision,
  textMessage: string,
): Promise<string> {
  const client = getClient();
  if (!client) return buildFallbackVoice(verdict, decision);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: buildVoicePrompt(verdict, decision, textMessage),
      }],
    });

    const text = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("").trim();

    return text || buildFallbackVoice(verdict, decision);
  } catch (err) {
    logger.warn("Alerts › Claude voice prompt failed — using fallback", { error: String(err).slice(0, 100) });
    return buildFallbackVoice(verdict, decision);
  }
}

function buildFallbackVoice(verdict: GuardVerdict, decision: TradeDecision): string {
  if (verdict.verdict === "HALT") {
    return `This is AgoraGuard with a critical alert. A halt has been triggered for ${verdict.symbol}. ` +
      `All trading has been paused and your funds have been moved to the Guardian Vault for safety. ` +
      `No action is needed. Check your dashboard for details.`;
  }
  return `This is AgoraGuard with a risk alert. Multiple caution flags have been raised for ${verdict.symbol}. ` +
    `Position sizes have been reduced automatically. Please review your portfolio. ` +
    `Check your dashboard for details.`;
}