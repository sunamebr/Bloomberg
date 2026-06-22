import type { AlphaSignal, TradeContext } from "./common";
import { isMarketLiquid } from "./common";

export interface MomentumConfig {
  minMomentum: number;
  maxMomentum: number;
  minVolume: number;
  maxSpread: number;
  maxPositionSize: number;
  minConfidence: number;
  lookbackPeriod: number;
}

export function nearParityMomentum(
  ctx: TradeContext,
  config: MomentumConfig,
  priceChange: number
): AlphaSignal {
  const { market, timeRemaining } = ctx;

  if (!isMarketLiquid(market, config.minVolume, config.maxSpread)) {
    return { action: "HOLD", confidence: 0, reason: "market_not_liquid" };
  }

  if (timeRemaining < 30) {
    return { action: "HOLD", confidence: 0, reason: "time_too_short" };
  }

  const absMomentum = Math.abs(priceChange);

  if (absMomentum < config.minMomentum) {
    return { action: "HOLD", confidence: 0, reason: "momentum_too_weak" };
  }

  if (absMomentum > config.maxMomentum) {
    return { action: "HOLD", confidence: 0, reason: "momentum_too_strong" };
  }

  const confidence = Math.min(absMomentum / config.maxMomentum, 1);
  const size = Math.min(config.maxPositionSize * confidence, config.maxPositionSize);

  return {
    action: priceChange > 0 ? "BUY" : "SELL",
    confidence,
    reason: "momentum_opportunity",
    metadata: {
      momentum: priceChange,
      size,
    },
  };
}
