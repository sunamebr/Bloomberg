import { Logger } from "../core";

const log = new Logger("alpha-lab");

export interface AlphaTrade {
  strategy: string;
  market: string;
  side: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPct: number;
  entryTime: number;
  exitTime: number;
  won: boolean;
}

export interface StrategyMetrics {
  strategy: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface AlphaState {
  trades: AlphaTrade[];
  metrics: StrategyMetrics[];
  lastUpdated: number;
}

export class AlphaLab {
  private state: AlphaState = {
    trades: [],
    metrics: [],
    lastUpdated: 0,
  };

  recordTrade(trade: AlphaTrade): void {
    this.state.trades.push(trade);
    this.updateMetrics();
    this.state.lastUpdated = Date.now();
  }

  private updateMetrics(): void {
    const strategies = new Set(this.state.trades.map((t) => t.strategy));
    this.state.metrics = [];

    for (const strategy of strategies) {
      const trades = this.state.trades.filter((t) => t.strategy === strategy);
      const metrics = this.calculateMetrics(strategy, trades);
      this.state.metrics.push(metrics);
    }

    // Sort by total PnL
    this.state.metrics.sort((a, b) => b.totalPnl - a.totalPnl);
  }

  private calculateMetrics(strategy: string, trades: AlphaTrade[]): StrategyMetrics {
    const wins = trades.filter((t) => t.won);
    const losses = trades.filter((t) => !t.won);

    const winPnls = wins.map((t) => t.pnl);
    const lossPnls = losses.map((t) => t.pnl);

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;

    const avgWin = winPnls.length > 0 ? winPnls.reduce((sum, p) => sum + p, 0) / winPnls.length : 0;
    const avgLoss = lossPnls.length > 0 ? lossPnls.reduce((sum, p) => sum + p, 0) / lossPnls.length : 0;

    const largestWin = winPnls.length > 0 ? Math.max(...winPnls) : 0;
    const largestLoss = lossPnls.length > 0 ? Math.min(...lossPnls) : 0;

    const grossProfit = winPnls.reduce((sum, p) => sum + p, 0);
    const grossLoss = Math.abs(lossPnls.reduce((sum, p) => sum + p, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const maxDrawdown = this.calculateMaxDrawdown(trades);
    const sharpeRatio = this.calculateSharpe(trades);

    const { consecutiveWins, consecutiveLosses } = this.calculateStreaks(trades);

    return {
      strategy,
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl,
      avgPnl,
      maxDrawdown,
      sharpeRatio,
      profitFactor,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      consecutiveWins,
      consecutiveLosses,
    };
  }

  private calculateMaxDrawdown(trades: AlphaTrade[]): number {
    if (trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let equity = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  private calculateSharpe(trades: AlphaTrade[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map((t) => t.pnlPct);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return avgReturn / stdDev;
  }

  private calculateStreaks(trades: AlphaTrade[]): { consecutiveWins: number; consecutiveLosses: number } {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const trade of trades) {
      if (trade.won) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      }
    }

    return { consecutiveWins: maxConsecutiveWins, consecutiveLosses: maxConsecutiveLosses };
  }

  getMetrics(): StrategyMetrics[] {
    return [...this.state.metrics];
  }

  getTopStrategies(limit: number = 5): StrategyMetrics[] {
    return this.state.metrics.slice(0, limit);
  }

  getStrategyMetrics(strategy: string): StrategyMetrics | null {
    return this.state.metrics.find((m) => m.strategy === strategy) || null;
  }

  getTrades(strategy?: string): AlphaTrade[] {
    if (strategy) {
      return this.state.trades.filter((t) => t.strategy === strategy);
    }
    return [...this.state.trades];
  }

  getState(): AlphaState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      trades: [],
      metrics: [],
      lastUpdated: 0,
    };
  }
}

export const alphaLab = new AlphaLab();
