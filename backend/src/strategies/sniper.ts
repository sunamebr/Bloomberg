import type { Strategy, StrategyContext } from "./types";

const MAX_SIZE = 25;
const MIN_SAMPLES = 10;
const WIN_RATE_FLOOR = 0.65;
const COOLDOWN = 5000;

interface PatternStats {
  wins: number;
  total: number;
}

function bucketPrice(p: number): string {
  return (Math.round(p * 20) / 20).toFixed(2);
}

function bucketTime(remaining: number): string {
  if (remaining > 240) return "early";
  if (remaining > 120) return "mid";
  if (remaining > 60) return "late";
  return "final";
}

function computeMomentum(prices: number[]): string {
  if (prices.length < 3) return "flat";
  const short = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const long = prices.reduce((a, b) => a + b, 0) / prices.length;
  const diff = short - long;
  const threshold = prices[prices.length - 1] * 0.0001;
  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "flat";
}

export const sniper: Strategy = async (ctx: StrategyContext) => {
  const stats = new Map<string, PatternStats>();
  const btcPrices: number[] = [];
  let lastTrade = 0;
  let pendingEntry: { price: number; side: "UP" | "DOWN"; pattern: string } | null = null;
  let awaitingResult = false;

  const interval = setInterval(() => {
    const btc = ctx.ticker.btc;
    if (btc != null) {
      btcPrices.push(btc);
      if (btcPrices.length > 10) btcPrices.shift();
    }

    if (awaitingResult) {
      const mr = ctx.getMarketResult();
      if (mr != null && pendingEntry != null) {
        const { price, side, pattern } = pendingEntry;
        let won = false;
        if (side === "UP") {
          won = mr.close > mr.open;
        } else {
          won = mr.close < mr.open;
        }
        const cur = stats.get(pattern) ?? { wins: 0, total: 0 };
        cur.total += 1;
        if (won) cur.wins += 1;
        stats.set(pattern, cur);
        pendingEntry = null;
        awaitingResult = false;
      }
      if (mr != null) awaitingResult = false;
    }

    const mid = ctx.orderbook.mid;
    if (mid == null) return;

    const momentum = computeMomentum(btcPrices);
    const pattern = `${momentum}:${bucketPrice(mid)}:${bucketTime(ctx.slot.remaining)}`;

    const entry = stats.get(pattern);
    const winRate = entry == null ? 0 : entry.wins / entry.total;
    const samples = entry == null ? 0 : entry.total;

    if (samples < MIN_SAMPLES || winRate < WIN_RATE_FLOOR) return;

    const { orderbook, wallet, postOrders, slot } = ctx;
    const bestBid = orderbook.bestBid;
    const bestAsk = orderbook.bestAsk;
    if (bestBid == null || bestAsk == null) return;

    const now = Date.now();
    if (now - lastTrade < COOLDOWN) return;

    const balance = wallet.usdcBalance;
    if (balance <= 0) return;

    if (momentum === "up") {
      const size = Math.min(MAX_SIZE, balance / bestAsk);
      if (size < 1) return;
      lastTrade = now;
      awaitingResult = true;
      pendingEntry = { price: bestAsk, side: "UP", pattern };
      // TODO: replace slot.asset with slot.upTokenId once engine populates it
      postOrders([
        {
          tokenId: slot.upTokenId ?? slot.asset,
          price: bestAsk,
          size,
          side: "BUY",
          orderType: "FOK",
        },
      ]);
    } else if (momentum === "down") {
      const size = Math.min(MAX_SIZE, balance / (1 - bestBid));
      if (size < 1) return;
      lastTrade = now;
      awaitingResult = true;
      pendingEntry = { price: 1 - bestBid, side: "DOWN", pattern };
      // BUGFIX: original used `slot.asset + "-DOWN"` (invalid Polymarket tokenId).
      // TODO: replace with slot.downTokenId once engine populates it
      postOrders([
        {
          tokenId: slot.downTokenId ?? `${slot.asset}-DOWN`,
          price: 1 - bestBid,
          size,
          side: "BUY",
          orderType: "FOK",
        },
      ]);
    }
  }, 1000);

  return () => clearInterval(interval);
};
