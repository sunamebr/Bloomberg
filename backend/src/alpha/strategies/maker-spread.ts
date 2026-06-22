import type { AlphaSignal, TradeContext } from "./common";
import { isMarketLiquid } from "./common";

export interface MakerSpreadConfig {
  minSpread: number;
  maxSpread: number;
  minVolume: number;
  feeRate: number;
  maxPositionSize: number;
  minConfidence: number;
}

export function makerSpreadCapture(ctx: TradeContext, config: MakerSpreadConfig): AlphaSignal {
  const { market, timeRemaining } = ctx;

  if (!isMarketLiquid(market, config.minVolume, config.maxSpread)) {
    return { action: "HOLD", confidence: 0, reason: "market_not_liquid" };
  }

  if (timeRemaining < 60) {
    return { action: "HOLD", confidence: 0, reason: "time_too_short" };
  }

  if (market.spread < config.minSpread) {
    return { action: "HOLD", confidence: 0, reason: "spread_too_tight" };
  }

  if (market.spread > config.maxSpread) {
    return { action: "HOLD", confidence: 0, reason: "spread_too_wide" };
  }

  const expectedProfit = market.spread - market.midPrice * config.feeRate * 2;
  
  if (expectedProfit <= 0) {
    return { action: "HOLD", confidence: 0, reason: "negative_expected_profit" };
  }

  const confidence = Math.min(market.spread / config.maxSpread, 1);
  const size = Math.min(config.maxPositionSize * confidence, config.maxPositionSize);

  return {
    action: "BUY",
    confidence,
    reason: "maker_spread_opportunity",
    metadata: {
      spread: market.spread,
      expectedProfit,
      size,
    },
  };
}
