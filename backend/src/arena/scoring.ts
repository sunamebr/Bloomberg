import { Logger } from "../core";

const log = new Logger("scoring");

export interface BotScore {
  botId: string;
  strategy: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  fitness: number;
}

export class BotScorer {
  private scores: Map<string, BotScore> = new Map();

  updateScore(botId: string, strategy: string, trades: Array<{ won: boolean; pnl: number }>): BotScore {
    const wins = trades.filter((t) => t.won).length;
    const losses = trades.filter((t) => !t.won).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

    const maxDrawdown = this.calculateMaxDrawdown(trades);
    const sharpeRatio = this.calculateSharpe(trades);
    const fitness = this.calculateFitness(winRate, totalPnl, maxDrawdown, sharpeRatio);

    const score: BotScore = {
      botId,
      strategy,
      totalTrades: trades.length,
      wins,
      losses,
      winRate,
      totalPnl,
      avgPnl,
      maxDrawdown,
      sharpeRatio,
      fitness,
    };

    this.scores.set(botId, score);
    log.info("Score updated: " + botId + " fitness=" + fitness.toFixed(2));

    return score;
  }

  private calculateMaxDrawdown(trades: Array<{ pnl: number }>): number {
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

  private calculateSharpe(trades: Array<{ pnl: number }>): number {
    if (trades.length < 2) return 0;

    const returns = trades.map((t) => t.pnl);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return avgReturn / stdDev;
  }

  private calculateFitness(winRate: number, totalPnl: number, maxDrawdown: number, sharpeRatio: number): number {
    const winRateScore = winRate / 100;
    const pnlScore = Math.min(totalPnl / 10, 1);
    const drawdownPenalty = Math.min(maxDrawdown / 5, 1);
    const sharpeScore = Math.min(sharpeRatio, 2) / 2;

    return (winRateScore * 0.3 + pnlScore * 0.3 + sharpeScore * 0.4) * (1 - drawdownPenalty * 0.5);
  }

  getScore(botId: string): BotScore | null {
    return this.scores.get(botId) || null;
  }

  getRanking(): BotScore[] {
    return Array.from(this.scores.values()).sort((a, b) => b.fitness - a.fitness);
  }

  getTopBots(limit: number = 5): BotScore[] {
    return this.getRanking().slice(0, limit);
  }

  getBottomBots(limit: number = 5): BotScore[] {
    return this.getRanking().slice(-limit).reverse();
  }

  reset(): void {
    this.scores.clear();
    log.info("Scoring reset");
  }
}

export const botScorer = new BotScorer();
