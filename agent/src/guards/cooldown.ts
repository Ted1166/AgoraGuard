import { RISK } from "../config.js";

const lastStopLossAt: Record<string, number> = {};

export interface CooldownResult {
  pass: boolean;
  isCooldownActive: boolean;
  secondsRemaining: number;
  reason: string;
}

export function checkCooldown(symbol: string): CooldownResult {
  const last = lastStopLossAt[symbol] ?? 0;
  const now = Date.now();
  const elapsed = (now - last) / 1_000;
  const remaining = Math.max(0, RISK.cooldownSecs - elapsed);

  const isCooldownActive = remaining > 0;

  const reason = isCooldownActive
    ? `Cooldown active - ${remaining.toFixed(0)}s remaining after stop-loss`
    : "No cooldown - ready to trade";

  return {
    pass: true,
    isCooldownActive,
    secondsRemaining: remaining,
    reason,
  };
}

export function triggerCooldown(symbol: string): void {
  lastStopLossAt[symbol] = Date.now();
}