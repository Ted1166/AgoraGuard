import OpenAI from "openai";
import { ALERTS } from "./config.js";
import { logger } from "../utils/logger.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

let _openai: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!ALERTS.openaiKey) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey: ALERTS.openaiKey });
  }
  return _openai;
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

  if (!client) {
    return buildFallbackVoice(verdict, decision, textMessage);
  }

  try {
    const response = await client.chat.completions.create({
      model: ALERTS.model,
      messages: [
        { role: "user", content: buildVoicePrompt(verdict, decision, textMessage) },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || buildFallbackVoice(verdict, decision, textMessage);
  } catch (err) {
    logger.warn("Alerts › OpenAI voice prompt failed — using fallback", { error: String(err).slice(0, 100) });
    return buildFallbackVoice(verdict, decision, textMessage);
  }
}

function buildFallbackVoice(
  verdict: GuardVerdict,
  _decision: TradeDecision,
  _textMessage: string,
): string {
  if (verdict.verdict === "HALT") {
    return `This is AgoraGuard with a critical alert. A halt has been triggered for ${verdict.symbol}. ` +
      `All trading has been paused and your funds have been moved to the Guardian Vault for safety. ` +
      `No action is needed. Check your dashboard for details.`;
  }

  return `This is AgoraGuard with a risk alert. Multiple caution flags have been raised for ${verdict.symbol}. ` +
    `Position sizes have been reduced automatically. Please review your portfolio. ` +
    `Check your dashboard for details.`;
}
