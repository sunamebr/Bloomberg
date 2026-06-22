import { Logger } from "../core";
import type { OrderBook } from "../market/discovery";

const log = new Logger("scanner");

export interface ArbOpportunity {
  marketId: string;
  upTokenId: string;
  downTokenId: string;
  upAsk: number;
  downAsk: number;
  totalCost: number;
  guaranteedPnl: number;
  edgePct: number;
  timestamp: number;
  detected: boolean;
}

export interface ScannerState {
  opportunities: ArbOpportunity[];
  lastScanAt: number;
  totalScans: number;
  nearArbCount: number;
  positiveArbCount: number;
}

export class Scanner {
  private state: ScannerState = {
    opportunities: [],
    lastScanAt: 0,
    totalScans: 0,
    nearArbCount: 0,
    positiveArbCount: 0,
  };

  scanBinaryArb(
    marketId: string,
    upBook: OrderBook,
    downBook: OrderBook
  ): ArbOpportunity | null {
    const upBestAsk = this.getBestAsk(upBook.asks);
    const downBestAsk = this.getBestAsk(downBook.asks);

    if (upBestAsk === null || downBestAsk === null) {
      return null;
    }

    const totalCost = upBestAsk + downBestAsk;
    const guaranteedPayout = 1.0; // Binary market: one side always pays 
    const guaranteedPnl = guaranteedPayout - totalCost;
    const edgePct = (guaranteedPnl / totalCost) * 100;

    const opportunity: ArbOpportunity = {
      marketId,
      upTokenId: upBook.tokenId,
      downTokenId: downBook.tokenId,
      upAsk: upBestAsk,
      downAsk: downBestAsk,
      totalCost,
      guaranteedPnl,
      edgePct,
      timestamp: Date.now(),
      detected: guaranteedPnl > 0,
    };

    this.updateState(opportunity);
    return opportunity;
  }

  private getBestAsk(asks: Array<{ price: string; size: string }>): number | null {
    if (!asks || asks.length === 0) return null;

    const sorted = asks
      .map((a) => ({ price: Number(a.price), size: Number(a.size) }))
      .filter((a) => a.size > 0)
      .sort((a, b) => a.price - b.price);

    return sorted.length > 0 ? sorted[0].price : null;
  }

  private updateState(opportunity: ArbOpportunity): void {
    this.state.lastScanAt = Date.now();
    this.state.totalScans++;

    if (opportunity.detected) {
      this.state.positiveArbCount++;
    } else if (opportunity.edgePct > -0.1) {
      // Near-arb: within 10bps
      this.state.nearArbCount++;
    }

    // Update or add opportunity
    const existing = this.state.opportunities.find((o) => o.marketId === opportunity.marketId);
    if (existing) {
      Object.assign(existing, opportunity);
    } else {
      this.state.opportunities.push(opportunity);
    }

    // Keep only recent opportunities (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.state.opportunities = this.state.opportunities.filter(
      (o) => o.timestamp > fiveMinutesAgo
    );
  }

  getState(): ScannerState {
    return { ...this.state };
  }

  getTopOpportunities(limit: number = 10): ArbOpportunity[] {
    return [...this.state.opportunities]
      .sort((a, b) => b.edgePct - a.edgePct)
      .slice(0, limit);
  }

  getNearArbOpportunities(thresholdBps: number = 10): ArbOpportunity[] {
    const threshold = -thresholdBps / 10000;
    return this.state.opportunities.filter(
      (o) => o.edgePct > threshold * 100 && !o.detected
    );
  }

  getPositiveArbOpportunities(): ArbOpportunity[] {
    return this.state.opportunities.filter((o) => o.detected);
  }

  reset(): void {
    this.state = {
      opportunities: [],
      lastScanAt: 0,
      totalScans: 0,
      nearArbCount: 0,
      positiveArbCount: 0,
    };
  }
}

export const scanner = new Scanner();
