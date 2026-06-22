import { Logger } from "../../core";

const log = new Logger("maker-audit");

export interface MakerTrade {
  timestamp: number;
  market: string;
  side: string;
  price: number;
  size: number;
  spread: number;
  filled: boolean;
  pnl: number;
}

export interface AuditResult {
  totalTrades: number;
  filledTrades: number;
  fillRate: number;
  avgSpread: number;
  totalPnl: number;
  avgPnl: number;
  winRate: number;
}

export class MakerRealityAudit {
  private trades: MakerTrade[] = [];

  recordTrade(trade: MakerTrade): void {
    this.trades.push(trade);
    log.info("Maker trade recorded: " + trade.market + " PnL=" + trade.pnl.toFixed(2));
  }

  audit(): AuditResult {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        filledTrades: 0,
        fillRate: 0,
        avgSpread: 0,
        totalPnl: 0,
        avgPnl: 0,
        winRate: 0,
      };
    }

    const filledTrades = this.trades.filter((t) => t.filled);
    const totalPnl = filledTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgSpread = this.trades.reduce((sum, t) => sum + t.spread, 0) / this.trades.length;
    const wins = filledTrades.filter((t) => t.pnl > 0).length;

    return {
      totalTrades: this.trades.length,
      filledTrades: filledTrades.length,
      fillRate: (filledTrades.length / this.trades.length) * 100,
      avgSpread,
      totalPnl,
      avgPnl: filledTrades.length > 0 ? totalPnl / filledTrades.length : 0,
      winRate: filledTrades.length > 0 ? (wins / filledTrades.length) * 100 : 0,
    };
  }

  getTrades(): MakerTrade[] {
    return [...this.trades];
  }

  reset(): void {
    this.trades = [];
    log.info("Maker audit reset");
  }
}

export const makerRealityAudit = new MakerRealityAudit();
