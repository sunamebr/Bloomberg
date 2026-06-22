import type { AlphaSignal, TradeContext } from "./common";
import { calculateEdge, isMarketLiquid } from "./common";

export interface MeanReversionConfig {
  deviationThreshold: number;
  minEdge: number;
  minVolume: number;
  maxSpread: number;
  feeRate: number;
  maxPositionSize: number;
  lookbackPeriod: number;
}

export function nearParityMeanReversion(
  ctx: TradeContext,
  config: MeanReversionConfig,
  historicalMean: number
): AlphaSignal {
  const { market, timeRemaining } = ctx;

  if (!isMarketLiquid(market, config.minVolume, config.maxSpread)) {
    return { action: "HOLD", confidence: 0, reason: "market_not_liquid" };
  }

  if (timeRemaining < 60) {
    return { action: "HOLD", confidence: 0, reason: "time_too_short" };
  }

  const deviation = Math.abs(market.midPrice - historicalMean) / historicalMean;

  if (deviation < config.deviationThreshold) {
    return { action: "HOLD", confidence: 0, reason: "price_near_mean" };
  }

  const expectedPrice = historicalMean;
  const edge = calculateEdge(market.bestAsk, expectedPrice, config.feeRate);

  if (edge < config.minEdge) {
    return { action: "HOLD", confidence: 0, reason: "edge_too_small" };
  }

  const confidence = Math.min(deviation / config.deviationThreshold, 1);
  const size = Math.min(config.maxPositionSize * confidence, config.maxPositionSize);

  return {
    action: market.midPrice < historicalMean ? "BUY" : "SELL",
    confidence,
    reason: "mean_reversion_opportunity",
    metadata: {
      deviation,
      historicalMean,
      edge,
      size,
    },
  };
}
