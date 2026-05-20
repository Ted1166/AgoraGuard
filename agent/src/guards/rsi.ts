import { RISK } from "../config.js";
import type { Candle } from "../monitor/prices.js";

export interface RSIResult {
  pass: boolean;
  isCaution: boolean;
  rsi: number;
  reason: string;
}

export function computeRSI(candles: Candle[], period = RISK.rsiPeriod): number {
  if (candles.length < period + 1) return 50;

  const closes = candles.map(c => c.close);
  const slice = closes.slice(-(period + 1));

  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const delta = slice[i] - slice[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  const avgGain = gains  / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function checkRSI(candles: Candle[]): RSIResult {
  const rsi = computeRSI(candles);
  const rsiRound = Math.round(rsi);

  const isCaution = rsi > RISK.rsiOverbought || rsi < RISK.rsiOversold;
  const pass = true; // RSI never halts — caution only

  const reason = rsi > RISK.rsiOverbought
    ? `RSI ${rsiRound} overbought (>${RISK.rsiOverbought})`
    : rsi < RISK.rsiOversold
    ? `RSI ${rsiRound} oversold (<${RISK.rsiOversold})`
    : `RSI ${rsiRound} — neutral zone`;

  return { pass, isCaution, rsi: rsiRound, reason };
}