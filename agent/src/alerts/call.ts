import Twilio from "twilio";
import { ALERTS } from "./config.js";
import { logger } from "../utils/logger.js";
import { getVoiceMessage } from "./voice-prompt.js";
import type { GuardVerdict } from "../guards/index.js";
import type { TradeDecision } from "../brain/index.js";

export interface CallResult {
  to: string;
  callSid: string | null;
  ok: boolean;
  error?: string;
}

let _twilio: Twilio.Twilio | null = null;

function getTwilio(): Twilio.Twilio | null {
  if (!ALERTS.twilio.accountSid || !ALERTS.twilio.authToken) return null;
  if (!_twilio) {
    _twilio = Twilio(ALERTS.twilio.accountSid, ALERTS.twilio.authToken);
  }
  return _twilio;
}

export async function makeAlertCalls(
  verdict: GuardVerdict,
  decision: TradeDecision,
  textMessage: string,
): Promise<CallResult[]> {
  const client = getTwilio();
  if (!client) {
    logger.warn("Alerts › Twilio not configured — skipping voice calls");
    return [];
  }

  if (!ALERTS.twilio.toPhones.length) {
    logger.warn("Alerts › no TWILIO_TO_PHONES set — skipping voice calls");
    return [];
  }

  const voiceMessage = await getVoiceMessage(verdict, decision, textMessage);

  const twiml = `<Response><Say voice="Polly.Joanna" language="en-US">${escapeXml(voiceMessage)}</Say></Response>`;

  const results: CallResult[] = [];

  for (const toPhone of ALERTS.twilio.toPhones) {
    try {
      const call = await client.calls.create({
        twiml,
        to: toPhone,
        from: ALERTS.twilio.fromPhone,
      });

      logger.info(`Alerts › 📞 call placed to ${toPhone} — SID: ${call.sid}`);
      results.push({ to: toPhone, callSid: call.sid, ok: true });
    } catch (err) {
      const errorMsg = String(err).slice(0, 120);
      logger.error(`Alerts › 📞 call to ${toPhone} failed: ${errorMsg}`);
      results.push({ to: toPhone, callSid: null, ok: false, error: errorMsg });
    }
  }

  return results;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
