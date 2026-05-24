import "dotenv/config";

export const ALERTS = {
  enabled: process.env.ALERTS_ENABLED !== "false",

  openaiKey: process.env.OPENAI_API_KEY ?? "",

  model: process.env.ALERTS_MODEL ?? "gpt-4o-mini",

  webhookUrls: parseUrls(process.env.ALERTS_WEBHOOK_URLS ?? ""),

  cooldownSecs: Number(process.env.ALERTS_COOLDOWN_SECS ?? 300),

  cautionFlagThreshold: Number(process.env.ALERTS_CAUTION_FLAG_THRESHOLD ?? 3),

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken:  process.env.TWILIO_AUTH_TOKEN ?? "",
    fromPhone:  process.env.TWILIO_FROM_PHONE ?? "",
    toPhones:   parseUrls(process.env.TWILIO_TO_PHONES ?? ""),
    enabled:    process.env.TWILIO_ENABLED === "true",
  },
} as const;

function parseUrls(raw: string): string[] {
  return raw
    .split(",")
    .map(u => u.trim())
    .filter(u => u.length > 0);
}
