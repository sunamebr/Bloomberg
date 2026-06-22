import { Logger } from "../core";

const log = new Logger("bayesian");

export interface TradeFeatures {
  priceBucket: string;
  momentumBucket: string;
  hourBucket: string;
  volumeBucket: string;
  timeBucket: string;
}

export interface FeatureInput {
  entryPrice: number;
  btcMomentum: number;
  hour: number;
  volume: number;
  timeRemaining: number;
}

export function extractFeatures(input: FeatureInput): TradeFeatures {
  const priceBucket =
    input.entryPrice < 0.4
      ? "low"
      : input.entryPrice < 0.55
      ? "mid"
      : input.entryPrice < 0.7
      ? "high"
      : "very_high";

  const absMom = Math.abs(input.btcMomentum);
  const momentumBucket = absMom < 0.01 ? "low" : absMom < 0.03 ? "medium" : "high";

  const hourBucket =
    input.hour < 6 ? "night" : input.hour < 12 ? "morning" : input.hour < 18 ? "afternoon" : "evening";

  const volumeBucket = input.volume < 100 ? "low" : input.volume < 500 ? "medium" : "high";

  const timeBucket =
    input.timeRemaining > 180
      ? "early"
      : input.timeRemaining > 60
      ? "mid"
      : input.timeRemaining > 30
      ? "late"
      : "critical";

  return { priceBucket, momentumBucket, hourBucket, volumeBucket, timeBucket };
}

interface FeatureStats {
  wins: number;
  losses: number;
}

function featureKey(f: TradeFeatures): string {
  return f.priceBucket + ":" + f.momentumBucket + ":" + f.hourBucket + ":" + f.volumeBucket + ":" + f.timeBucket;
}

export class BayesianEngine {
  private comboStats = new Map<string, FeatureStats>();
  private perFeatureStats = new Map<string, Map<string, FeatureStats>>();
  private _totalTrades = 0;

  get totalTrades(): number {
    return this._totalTrades;
  }

  recordTrade(features: TradeFeatures, won: boolean): void {
    this._totalTrades++;
    const key = featureKey(features);

    const stats = this.comboStats.get(key) ?? { wins: 0, losses: 0 };
    if (won) stats.wins++;
    else stats.losses++;
    this.comboStats.set(key, stats);

    for (const [field, value] of Object.entries(features)) {
      if (!this.perFeatureStats.has(field)) {
        this.perFeatureStats.set(field, new Map());
      }
      const fieldMap = this.perFeatureStats.get(field)!;
      const fStats = fieldMap.get(value) ?? { wins: 0, losses: 0 };
      if (won) fStats.wins++;
      else fStats.losses++;
      fieldMap.set(value, fStats);
    }
  }

  winRate(features: TradeFeatures): number | null {
    const stats = this.comboStats.get(featureKey(features));
    if (!stats || stats.wins + stats.losses === 0) return null;
    return stats.wins / (stats.wins + stats.losses);
  }

  featureWinRate(field: string, value: string): number | null {
    const fieldMap = this.perFeatureStats.get(field);
    if (!fieldMap) return null;
    const stats = fieldMap.get(value);
    if (!stats || stats.wins + stats.losses === 0) return null;
    return stats.wins / (stats.wins + stats.losses);
  }

  getTopCombos(limit: number = 10): Array<{ key: string; winRate: number; trades: number }> {
    const combos: Array<{ key: string; winRate: number; trades: number }> = [];

    for (const [key, stats] of this.comboStats.entries()) {
      const total = stats.wins + stats.losses;
      if (total > 0) {
        combos.push({
          key,
          winRate: stats.wins / total,
          trades: total,
        });
      }
    }

    return combos.sort((a, b) => b.winRate - a.winRate).slice(0, limit);
  }

  getFeatureAnalysis(field: string): Array<{ value: string; winRate: number; trades: number }> {
    const fieldMap = this.perFeatureStats.get(field);
    if (!fieldMap) return [];

    const results: Array<{ value: string; winRate: number; trades: number }> = [];

    for (const [value, stats] of fieldMap.entries()) {
      const total = stats.wins + stats.losses;
      if (total > 0) {
        results.push({
          value,
          winRate: stats.wins / total,
          trades: total,
        });
      }
    }

    return results.sort((a, b) => b.winRate - a.winRate);
  }

  reset(): void {
    this.comboStats.clear();
    this.perFeatureStats.clear();
    this._totalTrades = 0;
  }
}

export const bayesianEngine = new BayesianEngine();
