import type { Strategy, StrategyContext } from "./types";
import { resolveBinaryTokenId } from "./token-resolver";

const MAX_SIZE = 25;
const SHORT_WINDOW = 3;
const THRESHOLD_PCT = 0.0001;

export const momentum: Strategy = async (ctx: StrategyContext) => {
  const prices: number[] = [];
  let lastTrade = 0;
  const COOLDOWN = 5000;

  const interval = setInterval(() => {
    const btc = ctx.ticker.btc;
    if (btc == null) return;

    prices.push(btc);
    if (prices.length > 10) prices.shift();
    if (prices.length < SHORT_WINDOW + 1) return;

    const shortSlice = prices.slice(-SHORT_WINDOW);
    const shortMa = shortSlice.reduce((a, b) => a + b, 0) / shortSlice.length;
    const longMa = prices.reduce((a, b) => a + b, 0) / prices.length;

    const diff = shortMa - longMa;
    const threshold = btc * THRESHOLD_PCT;

    const { orderbook, wallet, postOrders, slot } = ctx;
    const bestBid = orderbook.bestBid;
    const bestAsk = orderbook.bestAsk;
    if (bestBid == null || bestAsk == null) return;

    const now = Date.now();
    if (now - lastTrade < COOLDOWN) return;

    const balance = wallet.usdcBalance;
    if (balance <= 0) return;

    if (diff > threshold) {
      const size = Math.min(MAX_SIZE, balance / bestAsk);
      if (size < 1) return;
      const tokenId = resolveBinaryTokenId(slot, "UP");
      if (!tokenId) return;
      lastTrade = now;
      postOrders([
        {
          tokenId,
          price: bestAsk,
          size,
          side: "BUY",
          orderType: "FOK",
        },
      ]);
    } else if (diff < -threshold) {
      const size = Math.min(MAX_SIZE, balance / (1 - bestBid));
      if (size < 1) return;
      const tokenId = resolveBinaryTokenId(slot, "DOWN");
      if (!tokenId) return;
      lastTrade = now;
      postOrders([
        {
          tokenId,
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
