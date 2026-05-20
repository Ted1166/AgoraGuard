import { RISK } from "../config.js";

export interface DrawdownResult {
  pass: boolean;
  isHalt: boolean;
  isCaution: boolean;
  drawdownPct: number;
  drawdownBps: number;
  peakValue: number;
  reason: string;
}

const peakBySymbol: Record<string, number> = {};

export function checkDrawdown(
  symbol: string,
  currentPrice: number
): DrawdownResult {
  const prevPeak = peakBySymbol[symbol] ?? currentPrice;
  const peak = Math.max(prevPeak, currentPrice);
  peakBySymbol[symbol] = peak;

  const drawdownPct = peak > 0 ? (peak - currentPrice) / peak : 0;
  const drawdownBps = Math.round(drawdownPct * 10_000);

  const isHalt = drawdownPct >= RISK.haltDrawdownPct;
  const isCaution = !isHalt && drawdownPct >= RISK.cautionDrawdownPct;
  const pass = !isHalt;

  const reason = isHalt
    ? `Drawdown ${(drawdownPct * 100).toFixed(2)}% ≥ halt threshold ${(RISK.haltDrawdownPct * 100)}%`
    : isCaution
    ? `Drawdown ${(drawdownPct * 100).toFixed(2)}% ≥ caution threshold ${(RISK.cautionDrawdownPct * 100)}%`
    : `Drawdown ${(drawdownPct * 100).toFixed(2)}% - within limits`;

  return { pass, isHalt, isCaution, drawdownPct, drawdownBps, peakValue: peak, reason };
}

export function resetPeak(symbol: string): void {
  delete peakBySymbol[symbol];
}