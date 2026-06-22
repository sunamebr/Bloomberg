import type { Strategy, StrategyContext } from "./types";
import { RSI, ATR, RollingVolatility, peakGapRatio } from "./indicators";

const MAX_SIZE = 25;
const ENTRY_WINDOW = 90;
const ATR_CAP = 2;
const PGR_FLOOR = 0.75;
const DOMINANCE_FLOOR = 0.85;
const VOL_CAP = 0.15;

export const lateEntry: Strategy = async (ctx: StrategyContext) => {
  const rsi = new RSI(14);
  const atr = new ATR(14);
  const vol = new RollingVolatility(30);

  let peakGap = 0;
  let entered = false;

  const interval = setInterval(() => {
    if (entered) return;
    const { orderbook, slot, wallet, postOrders } = ctx;
    const mid = orderbook.mid;
    if (mid == null) return;

    const rsiVal = rsi.update(mid);
    const atrVal = atr.update(mid);
    const volVal = vol.update(mid);

    const bestBid = orderbook.bestBid ?? 0;
    const bestAsk = orderbook.bestAsk ?? 1;

    const upSide = bestBid;
    const downSide = 1 - bestAsk;

    const gap = Math.abs(upSide - downSide);
    if (gap > peakGap) peakGap = gap;
    const pgr = peakGapRatio(gap, peakGap);

    if (slot.remaining > ENTRY_WINDOW) return;
    if (atrVal == null || atrVal > ATR_CAP) return;
    if (volVal != null && volVal > VOL_CAP) return;
    if (pgr < PGR_FLOOR) return;

    const balance = wallet.usdcBalance;
    if (balance <= 0) return;

    if (upSide > DOMINANCE_FLOOR && upSide > downSide && (rsiVal == null || rsiVal >= 50)) {
      const size = Math.min(MAX_SIZE, balance / bestAsk);
      if (size < 1) return;
      entered = true;
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
    } else if (downSide > DOMINANCE_FLOOR && downSide > upSide && (rsiVal == null || rsiVal <= 50)) {
      const size = Math.min(MAX_SIZE, balance / (1 - bestBid));
      if (size < 1) return;
      entered = true;
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
