import type { AlphaSignal, TradeContext } from "./common";
import { calculateEdge, calculatePositionSize, isMarketLiquid } from "./common";

export interface BookLagConfig {
  minEdge: number;
  minConfidence: number;
  maxPositionSize: number;
  feeRate: number;
  minVolume: number;
  maxSpread: number;
  bookLagThreshold: number;
}

export function booklagV7(ctx: TradeContext, config: BookLagConfig): AlphaSignal {
  const { market, timeRemaining, position } = ctx;

  if (!isMarketLiquid(market, config.minVolume, config.maxSpread)) {
    return { action: "HOLD", confidence: 0, reason: "market_not_liquid" };
  }

  if (timeRemaining < 30) {
    return { action: "HOLD", confidence: 0, reason: "time_too_short" };
  }

  const bookLag = Math.abs(market.bestBid - market.bestAsk) / market.midPrice;
  
  if (bookLag < config.bookLagThreshold) {
    return { action: "HOLD", confidence: 0, reason: "book_lag_too_small" };
  }

  const expectedPrice = market.midPrice;
  const edge = calculateEdge(market.bestAsk, expectedPrice, config.feeRate);

  if (edge < config.minEdge) {
    return { action: "HOLD", confidence: 0, reason: "edge_too_small" };
  }

  const confidence = Math.min(edge / config.minEdge, 1);
  const size = calculatePositionSize(edge, confidence, ctx.equity, config.maxPositionSize);

  if (size <= 0) {
    return { action: "HOLD", confidence: 0, reason: "position_size_zero" };
  }

  return {
    action: "BUY",
    confidence,
    reason: "book_lag_opportunity",
    metadata: {
      edge,
      size,
      bookLag,
      expectedPrice,
    },
  };
}
