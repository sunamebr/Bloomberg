import type { Strategy, StrategyContext } from "./types";
import { RSI, bollingerBands, zScore } from "./indicators";

const MAX_SIZE = 25;
const PRICE_WINDOW = 50;
const BB_PERIOD = 20;
const Z_FLOOR = 1.5;
const PRICE_CEIL = 0.72;
const PRICE_FLOOR = 0.35;
const COOLDOWN = 5000;

export const meanReversion: Strategy = async (ctx: StrategyContext) => {
  const prices: number[] = [];
  const rsi = new RSI(14);
  let lastTrade = 0;

  const interval = setInterval(() => {
    const mid = ctx.orderbook.mid;
    if (mid == null) return;

    prices.push(mid);
    if (prices.length > PRICE_WINDOW) prices.shift();
    rsi.update(mid);

    if (prices.length < BB_PERIOD) return;

    const bb = bollingerBands(prices, BB_PERIOD);
    if (bb == null) return;

    const slice = prices.slice(-BB_PERIOD);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / slice.length;
    const stdDev = Math.sqrt(variance);
    const z = zScore(mid, mean, stdDev);

    if (mid > PRICE_CEIL || mid < PRICE_FLOOR) return;

    const { orderbook, wallet, postOrders, slot } = ctx;
    const bestBid = orderbook.bestBid;
    const bestAsk = orderbook.bestAsk;
    if (bestBid == null || bestAsk == null) return;

    const now = Date.now();
    if (now - lastTrade < COOLDOWN) return;

    const balance = wallet.usdcBalance;
    if (balance <= 0) return;

    if (z < -Z_FLOOR) {
      const size = Math.min(MAX_SIZE, balance / bestAsk);
      if (size < 1) return;
      lastTrade = now;
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
    } else if (z > Z_FLOOR) {
      const size = Math.min(MAX_SIZE, balance / (1 - bestBid));
      if (size < 1) return;
      lastTrade = now;
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
