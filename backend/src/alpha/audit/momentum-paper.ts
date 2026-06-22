import { Logger } from "../../core";

const log = new Logger("momentum-audit");

export interface MomentumTrade {
  timestamp: number;
  market: string;
  side: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  momentum: number;
  pnl: number;
  won: boolean;
}

export interface MomentumAuditResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgMomentum: number;
  bestTrade: MomentumTrade | null;
  worstTrade: MomentumTrade | null;
}

export class MomentumPaperAudit {
  private trades: MomentumTrade[] = [];

  recordTrade(trade: MomentumTrade): void {
    this.trades.push(trade);
    log.info("Momentum trade recorded: " + trade.market + " momentum=" + trade.momentum.toFixed(4));
  }

  audit(): MomentumAuditResult {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        avgMomentum: 0,
        bestTrade: null,
        worstTrade: null,
      };
    }

    const wins = this.trades.filter((t) => t.won);
    const losses = this.trades.filter((t) => !t.won);
    const totalPnl = this.trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgMomentum = this.trades.reduce((sum, t) => sum + Math.abs(t.momentum), 0) / this.trades.length;

    const sortedByPnl = [...this.trades].sort((a, b) => b.pnl - a.pnl);
    const bestTrade = sortedByPnl[0] || null;
    const worstTrade = sortedByPnl[sortedByPnl.length - 1] || null;

    return {
      totalTrades: this.trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / this.trades.length) * 100,
      totalPnl,
      avgPnl: totalPnl / this.trades.length,
      avgMomentum,
      bestTrade,
      worstTrade,
    };
  }

  getTrades(): MomentumTrade[] {
    return [...this.trades];
  }

  reset(): void {
    this.trades = [];
    log.info("Momentum audit reset");
  }
}

export const momentumPaperAudit = new MomentumPaperAudit();
