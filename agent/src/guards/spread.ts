import { RISK } from "../config.js";
import type { Ticker } from "../monitor/prices.js";

export interface SpreadResult {
  pass: boolean;
  isHalt: boolean;
  isCaution: boolean;
  spreadBps: number;
  reason: string;
}

export function checkSpread(ticker: Ticker): SpreadResult {
  const { spreadBps } = ticker;

  const isHalt = spreadBps >= RISK.spreadHaltBps;
  const isCaution = !isHalt && spreadBps >= RISK.spreadCautionBps;
  const pass = !isHalt;

  const reason = isHalt
    ? `Spread ${spreadBps}bps ≥ halt threshold ${RISK.spreadHaltBps}bps - thin liquidity`
    : isCaution
    ? `Spread ${spreadBps}bps ≥ caution threshold ${RISK.spreadCautionBps}bps`
    : `Spread ${spreadBps}bps - healthy liquidity`;

  return { pass, isHalt, isCaution, spreadBps, reason };
}