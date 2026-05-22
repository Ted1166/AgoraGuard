import { logger } from "../utils/logger.js";

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface Ticker {
  symbol: string;
  price: number;
  bidPrice: number;
  askPrice: number;
  spread: number;
  spreadBps: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface MarketSnapshot {
  tickers: Record<string, Ticker>;
  candles: Record<string, Candle[]>;
  fetchedAt: number;
}

const BASE = "https://api.binance.com/api/v3";

const SYMBOLS = ["BTCUSDT", "ETHUSDT"] as const;
const SYNTHETIC_SYMBOLS = ["EURUSDT"] as const;

export type Symbol = typeof SYMBOLS[number] | typeof SYNTHETIC_SYMBOLS[number];

const ALL_SYMBOLS: Symbol[] = [...SYMBOLS, ...SYNTHETIC_SYMBOLS];
export { ALL_SYMBOLS as MONITORED_SYMBOLS };

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function fetchTicker(symbol: string): Promise<Ticker> {
  const [book, stats] = await Promise.all([
    fetchJSON<{ symbol: string; bidPrice: string; askPrice: string }>(
      `${BASE}/ticker/bookTicker?symbol=${symbol}`
    ),
    fetchJSON<{
      lastPrice: string; priceChangePercent: string;
      volume: string; highPrice: string; lowPrice: string;
    }>(`${BASE}/ticker/24hr?symbol=${symbol}`),
  ]);

  const bid = parseFloat(book.bidPrice);
  const ask = parseFloat(book.askPrice);
  const price = (bid + ask) / 2;
  const spread = ask - bid;
  const spreadBps = price > 0 ? Math.round((spread / price) * 10_000) : 0;

  return {
    symbol,
    price,
    bidPrice: bid,
    askPrice: ask,
    spread,
    spreadBps,
    change24h: parseFloat(stats.priceChangePercent),
    volume24h: parseFloat(stats.volume),
    high24h: parseFloat(stats.highPrice),
    low24h: parseFloat(stats.lowPrice),
    timestamp: Date.now(),
  };
}

async function fetchCandles(symbol: string, limit = 50): Promise<Candle[]> {
  type RawCandle = [number, string, string, string, string, string, number, ...unknown[]];
  const raw = await fetchJSON<RawCandle[]>(
    `${BASE}/klines?symbol=${symbol}&interval=1h&limit=${limit}`
  );
  return raw.map(c => ({
    openTime: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
    closeTime: c[6],
  }));
}

async function fetchEURUSDT(): Promise<Ticker> {
  const data = await fetchJSON<{ rates: { USD: number } }>(
    "https://api.frankfurter.app/latest?from=EUR&to=USD"
  );
  const price = data.rates.USD;
  return {
    symbol: "EURUSDT",
    price,
    bidPrice: price - 0.0001,
    askPrice: price + 0.0001,
    spread: 0.0002,
    spreadBps: Math.round((0.0002 / price) * 10_000),
    change24h: 0,
    volume24h: 0,
    high24h: price,
    low24h: price,
    timestamp: Date.now(),
  };
}

function syntheticCandles(price: number, limit = 50): Candle[] {
  const now = Date.now();
  const candles: Candle[] = [];

  let close = price * 0.995;

  for (let i = 0; i < limit; i++) {
    const meanReversion = (price - close) * 0.05;
    const noise = (Math.random() - 0.5) * price * 0.001;
    const open = close;
    close = open + meanReversion + noise;

    const range = price * 0.0008;
    const high = Math.max(open, close) + Math.random() * range;
    const low = Math.min(open, close) - Math.random() * range;

    candles.push({
      openTime: now - (limit - i) * 3_600_000,
      open,
      high,
      low,
      close,
      volume: 1_000_000 + Math.random() * 500_000,
      closeTime: now - (limit - i - 1) * 3_600_000,
    });
  }

  return candles;
}

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  logger.info("Monitor › fetching market snapshot from Binance...");

  const binanceResults = await Promise.allSettled(
    [...SYMBOLS].map(async (sym) => ({
      symbol: sym as string,
      ticker: await fetchTicker(sym),
      candles: await fetchCandles(sym),
    }))
  );

  const eurResult = await Promise.allSettled([
    fetchEURUSDT().then(ticker => ({
      symbol: "EURUSDT",
      ticker,
      candles: syntheticCandles(ticker.price),
    })),
  ]);

  const tickers: Record<string, Ticker> = {};
  const candles: Record<string, Candle[]> = {};

  for (const result of [...binanceResults, ...eurResult]) {
    if (result.status === "fulfilled") {
      const { symbol, ticker, candles: c } = result.value;
      tickers[symbol] = ticker;
      candles[symbol] = c;
      logger.info(
        `Monitor › ${symbol} $${ticker.price.toFixed(2)} ` +
        `spread ${ticker.spreadBps}bps  24h ${ticker.change24h.toFixed(2)}%`
      );
    } else {
      logger.warn("Monitor › failed to fetch symbol", { error: result.reason });
    }
  }

  return { tickers, candles, fetchedAt: Date.now() };
}