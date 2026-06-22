import type { Strategy, StrategyContext } from "./types";
import { RSI, bollingerBands, zScore } from "./indicators";

const MAX_SIZE = 25;
const CONFIDENCE_CAP = 0.45;
const ENTRY_FLOOR = 0.3;
const W_MOM = 0.4;
const W_MR = 0.35;
const W_RSI = 0.25;
const SHORT_WINDOW = 3;
const BB_PERIOD = 20;
const COOLDOWN = 5000;

export const hybrid: Strategy = async (ctx: StrategyContext) => {
  const btcPrices: number[] = [];
  const midPrices: number[] = [];
  const rsi = new RSI(14);
  let lastTrade = 0;

  const interval = setInterval(() => {
    const btc = ctx.ticker.btc;
    const mid = ctx.orderbook.mid;
    if (btc == null || mid == null) return;

    btcPrices.push(btc);
    if (btcPrices.length > 10) btcPrices.shift();
    midPrices.push(mid);
    if (midPrices.length > 50) midPrices.shift();

    const rsiVal = rsi.update(mid);

    let momSignal = 0;
    if (btcPrices.length >= SHORT_WINDOW + 1) {
      const shortSlice = btcPrices.slice(-SHORT_WINDOW);
      const shortMa = shortSlice.reduce((a, b) => a + b, 0) / shortSlice.length;
      const longMa = btcPrices.reduce((a, b) => a + b, 0) / btcPrices.length;
      const diff = shortMa - longMa;
      const threshold = btc * 0.0001;
      if (diff > threshold) momSignal = 1;
      else if (diff < -threshold) momSignal = -1;
    }

    let mrSignal = 0;
    if (midPrices.length >= BB_PERIOD) {
      const bb = bollingerBands(midPrices, BB_PERIOD);
      if (bb != null) {
        const slice = midPrices.slice(-BB_PERIOD);
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / slice.length;
        const stdDev = Math.sqrt(variance);
        const z = zScore(mid, mean, stdDev);
        if (z < -1.5) mrSignal = 1;
        else if (z > 1.5) mrSignal = -1;
      }
    }

    let rsiSignal = 0;
    if (rsiVal != null) {
      if (rsiVal < 30) rsiSignal = 1;
      else if (rsiVal > 70) rsiSignal = -1;
    }

    const combined = W_MOM * momSignal + W_MR * mrSignal + W_RSI * rsiSignal;
    const absCombined = Math.abs(combined);
    if (absCombined < ENTRY_FLOOR) return;

    const { orderbook, wallet, postOrders, slot } = ctx;
    const bestBid = orderbook.bestBid;
    const bestAsk = orderbook.bestAsk;
    if (bestBid == null || bestAsk == null) return;

    const now = Date.now();
    if (now - lastTrade < COOLDOWN) return;

    const balance = wallet.usdcBalance;
    if (balance <= 0) return;

    const confidence = Math.min(CONFIDENCE_CAP, absCombined);
    const maxByBalance = balance / (combined > 0 ? bestAsk : 1 - bestBid);
    const size = Math.min(MAX_SIZE, maxByBalance * confidence);
    if (size < 1) return;

    lastTrade = now;
    if (combined > 0) {
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
    } else {
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
