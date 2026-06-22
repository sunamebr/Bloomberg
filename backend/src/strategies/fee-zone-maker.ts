import type { Strategy, StrategyContext } from "./types";
import { resolveBinaryTokenId } from "./token-resolver";

const MAX_SIZE = 25;
const MID_FLOOR = 0.6;
const MID_CEIL = 0.82;
const MIN_SPREAD = 0.02;
const TICK = 0.01;

export const feeZoneMaker: Strategy = async (ctx: StrategyContext) => {
  const pendingIds = new Set<string>();
  let lastCheck = 0;

  const interval = setInterval(() => {
    const { orderbook, wallet, postOrders, cancelOrders, slot } = ctx;
    const mid = orderbook.mid;
    if (mid == null) return;
    if (mid < MID_FLOOR || mid > MID_CEIL) {
      if (pendingIds.size > 0) {
        cancelOrders([...pendingIds]);
        pendingIds.clear();
      }
      return;
    }

    const spread = orderbook.spread;
    if (spread == null || spread < MIN_SPREAD) return;

    const bestBid = orderbook.bestBid;
    const bestAsk = orderbook.bestAsk;
    if (bestBid == null || bestAsk == null) return;

    const balance = wallet.usdcBalance;
    if (balance <= 0) return;

    const now = Date.now();
    if (now - lastCheck < 2000) return;
    lastCheck = now;

    const buyPrice = Math.min(bestAsk - TICK, bestBid + TICK);
    const sellPrice = Math.max(bestBid + TICK, bestAsk - TICK);

    if (buyPrice > 0 && buyPrice < bestAsk) {
      const size = Math.min(MAX_SIZE, balance / buyPrice);
      if (size >= 1) {
        const tokenId = resolveBinaryTokenId(slot, "UP");
        if (tokenId) {
          postOrders([{
            tokenId,
            price: Number(buyPrice.toFixed(4)),
            size,
            side: "BUY",
            orderType: "GTC",
          }]);
        }
      }
    }

    if (sellPrice < 1 && sellPrice > bestBid) {
      const size = Math.min(MAX_SIZE, balance / (1 - sellPrice));
      if (size >= 1) {
        const tokenId = resolveBinaryTokenId(slot, "DOWN");
        if (tokenId) {
          postOrders([{
            tokenId,
            price: Number((1 - sellPrice).toFixed(4)),
            size,
            side: "BUY",
            orderType: "GTC",
          }]);
        }
      }
    }
  }, 2000);

  return () => clearInterval(interval);
};
