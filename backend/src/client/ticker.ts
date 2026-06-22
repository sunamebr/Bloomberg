import type { TickerSnapshot } from "./types";

interface TickerOptions {
  stalenessMs?: number;
  divergenceThreshold?: number;
}

interface PriceEntry {
  price: number;
  timestamp: number;
}

const SYMBOL_MAP: Record<string, "btc" | "eth"> = {
  BTCUSDT: "btc", BTCUSD: "btc", "BTC-USD": "btc", "BTC-USDT": "btc",
  ETHUSDT: "eth", ETHUSD: "eth", "ETH-USD": "eth", "ETH-USDT": "eth",
};

export class Ticker {
  private prices = new Map<string, PriceEntry>();
  private stalenessMs: number;
  private divergenceThreshold: number;

  constructor(opts: TickerOptions = {}) {
    this.stalenessMs = opts.stalenessMs ?? 1000;
    this.divergenceThreshold = opts.divergenceThreshold ?? 50;
  }

  update(source: string, symbol: string, price: number): void {
    const key = `${source}:${symbol}`;
    this.prices.set(key, { price, timestamp: Date.now() });
  }

  isStale(source: string): boolean {
    const now = Date.now();
    for (const [key, entry] of this.prices) {
      if (key.startsWith(source + ":")) {
        if (now - entry.timestamp > this.stalenessMs) return true;
      }
    }
    return false;
  }

  hasDivergence(): boolean {
    const btcPrices: number[] = [];
    for (const [key, entry] of this.prices) {
      const symbol = key.split(":")[1];
      if (SYMBOL_MAP[symbol] === "btc") {
        btcPrices.push(entry.price);
      }
    }
    if (btcPrices.length < 2) return false;
    const max = Math.max(...btcPrices);
    const min = Math.min(...btcPrices);
    return (max - min) > this.divergenceThreshold;
  }

  detectWhaleDump(binancePrice: number, coinbasePrice: number, threshold = 0.0015): boolean {
    if (binancePrice === 0) return false;
    return Math.abs(binancePrice - coinbasePrice) / binancePrice > threshold;
  }

  snapshot(): TickerSnapshot {
    let btc: number | null = null;
    let eth: number | null = null;
    let polymarket: number | null = null;
    let lastUpdate = 0;

    for (const [key, entry] of this.prices) {
      const [source, symbol] = key.split(":");
      const asset = SYMBOL_MAP[symbol];
      if (asset === "btc" && btc == null) btc = entry.price;
      if (asset === "eth" && eth == null) eth = entry.price;
      if (source === "polymarket") polymarket = entry.price;
      if (entry.timestamp > lastUpdate) lastUpdate = entry.timestamp;
    }

    return { btc, eth, polymarket, lastUpdate };
  }
}
