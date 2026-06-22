export interface AlphaSignal {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface MarketData {
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  volume24h: number;
  volatility: number;
}

export interface TradeContext {
  market: MarketData;
  timeRemaining: number;
  position: number;
  equity: number;
}

export function calculateEdge(entryPrice: number, expectedPrice: number, feeRate: number): number {
  const grossEdge = expectedPrice - entryPrice;
  const fees = entryPrice * feeRate + expectedPrice * feeRate;
  return grossEdge - fees;
}

export function calculatePositionSize(edge: number, confidence: number, equity: number, maxSize: number): number {
  const kelly = edge / (1 - edge);
  const fractionalKelly = kelly * 0.5 * confidence;
  const size = equity * fractionalKelly;
  return Math.min(Math.max(size, 0), maxSize);
}

export function isMarketLiquid(market: MarketData, minVolume: number, maxSpread: number): boolean {
  return market.volume24h >= minVolume && market.spread <= maxSpread;
}
