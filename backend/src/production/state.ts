import { Logger } from "../core";

const log = new Logger("production-state");

export interface TradeRecord {
  id: string;
  strategy: string;
  market: string;
  side: string;
  size: number;
  price: number;
  pnl: number;
  timestamp: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  pnl: number;
  drawdown: number;
  consecutiveLosses: number;
  peakEquity: number;
  currentEquity: number;
}

export class ProductionState {
  private dailyStats: Map<string, DailyStats> = new Map();
  private trades: TradeRecord[] = [];
  private currentEquity: number;
  private peakEquity: number;

  constructor(initialEquity: number = 100) {
    this.currentEquity = initialEquity;
    this.peakEquity = initialEquity;
  }

  recordTrade(trade: TradeRecord): void {
    this.trades.push(trade);
    this.currentEquity += trade.pnl;
    
    if (this.currentEquity > this.peakEquity) {
      this.peakEquity = this.currentEquity;
    }

    const today = new Date().toISOString().slice(0, 10);
    let stats = this.dailyStats.get(today);
    
    if (!stats) {
      stats = {
        date: today,
        trades: 0,
        pnl: 0,
        drawdown: 0,
        consecutiveLosses: 0,
        peakEquity: this.peakEquity,
        currentEquity: this.currentEquity,
      };
      this.dailyStats.set(today, stats);
    }

    stats.trades++;
    stats.pnl += trade.pnl;
    stats.currentEquity = this.currentEquity;

    if (trade.pnl < 0) {
      stats.consecutiveLosses++;
      const drawdown = this.peakEquity - this.currentEquity;
      if (drawdown > stats.drawdown) {
        stats.drawdown = drawdown;
      }
    } else {
      stats.consecutiveLosses = 0;
    }

    log.info("Trade recorded: " + trade.id + " PnL: " + trade.pnl.toFixed(2));
  }

  getTodayStats(): DailyStats | null {
    const today = new Date().toISOString().slice(0, 10);
    return this.dailyStats.get(today) || null;
  }

  getDailyStats(date: string): DailyStats | null {
    return this.dailyStats.get(date) || null;
  }

  getRecentTrades(limit: number = 50): TradeRecord[] {
    return this.trades.slice(-limit).reverse();
  }

  getEquity(): number {
    return this.currentEquity;
  }

  getDrawdown(): number {
    return this.peakEquity - this.currentEquity;
  }

  reset(): void {
    this.dailyStats.clear();
    this.trades = [];
    this.currentEquity = 100;
    this.peakEquity = 100;
    log.info("Production state reset");
  }
}

export const productionState = new ProductionState();
