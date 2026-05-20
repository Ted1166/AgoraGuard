import { RISK } from "../config.js";
import type { Candle } from "../monitor/prices.js";

export interface VolatilityResult {
  pass: boolean;
  isHalt: boolean;
  isCaution: boolean;
  atr: number;
  atrMultiple: number;
  atrMultipleBps: number;
  reason: string;
}

function computeATR(candles: Candle[], period: number): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low  - prevClose)
    );
    trueRanges.push(tr);
  }

  const slice = trueRanges.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function checkVolatility(candles: Candle[]): VolatilityResult {
  if (candles.length < RISK.atrPeriod + 5) {
    return {
      pass: true, isHalt: false, isCaution: false,
      atr: 0, atrMultiple: 1, atrMultipleBps: 100,
      reason: "Insufficient candle history — skipping volatility guard",
    };
  }

  const currentATR = computeATR(candles.slice(-RISK.atrPeriod - 1), RISK.atrPeriod);
  const baselineATR = computeATR(
    candles.slice(-(RISK.atrPeriod * 2 + 1)),
    RISK.atrPeriod * 2
  );

  const atrMultiple    = baselineATR > 0 ? currentATR / baselineATR : 1;
  const atrMultipleBps = Math.round(atrMultiple * 100);

  const isHalt    = atrMultiple >= RISK.atrHaltMultiple;
  const isCaution = !isHalt && atrMultiple >= RISK.atrCautionMultiple;
  const pass      = !isHalt;

  const reason = isHalt
    ? `ATR ${atrMultiple.toFixed(2)}× avg ≥ halt threshold ${RISK.atrHaltMultiple}×`
    : isCaution
    ? `ATR ${atrMultiple.toFixed(2)}× avg ≥ caution threshold ${RISK.atrCautionMultiple}×`
    : `ATR ${atrMultiple.toFixed(2)}× avg — normal regime`;

  return { pass, isHalt, isCaution, atr: currentATR, atrMultiple, atrMultipleBps, reason };
}