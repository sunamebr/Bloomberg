import { Logger } from "../core";

const log = new Logger("features");

export interface RawFeatures {
  entryPrice: number;
  btcMomentum: number;
  hour: number;
  volume: number;
  timeRemaining: number;
  spread: number;
  bookDepth: number;
  volatility: number;
}

export interface BucketedFeatures {
  priceBucket: string;
  momentumBucket: string;
  hourBucket: string;
  volumeBucket: string;
  timeBucket: string;
  spreadBucket: string;
  depthBucket: string;
  volatilityBucket: string;
}

export class FeatureExtractor {
  extract(input: RawFeatures): BucketedFeatures {
    return {
      priceBucket: this.bucketPrice(input.entryPrice),
      momentumBucket: this.bucketMomentum(input.btcMomentum),
      hourBucket: this.bucketHour(input.hour),
      volumeBucket: this.bucketVolume(input.volume),
      timeBucket: this.bucketTime(input.timeRemaining),
      spreadBucket: this.bucketSpread(input.spread),
      depthBucket: this.bucketDepth(input.bookDepth),
      volatilityBucket: this.bucketVolatility(input.volatility),
    };
  }

  private bucketPrice(price: number): string {
    if (price < 0.3) return "very_low";
    if (price < 0.4) return "low";
    if (price < 0.55) return "mid";
    if (price < 0.7) return "high";
    return "very_high";
  }

  private bucketMomentum(momentum: number): string {
    const abs = Math.abs(momentum);
    if (abs < 0.005) return "flat";
    if (abs < 0.01) return "low";
    if (abs < 0.03) return "medium";
    return "high";
  }

  private bucketHour(hour: number): string {
    if (hour < 6) return "night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }

  private bucketVolume(volume: number): string {
    if (volume < 50) return "very_low";
    if (volume < 100) return "low";
    if (volume < 500) return "medium";
    if (volume < 1000) return "high";
    return "very_high";
  }

  private bucketTime(timeRemaining: number): string {
    if (timeRemaining > 240) return "very_early";
    if (timeRemaining > 180) return "early";
    if (timeRemaining > 60) return "mid";
    if (timeRemaining > 30) return "late";
    return "critical";
  }

  private bucketSpread(spread: number): string {
    if (spread < 0.01) return "tight";
    if (spread < 0.02) return "normal";
    if (spread < 0.05) return "wide";
    return "very_wide";
  }

  private bucketDepth(depth: number): string {
    if (depth < 100) return "shallow";
    if (depth < 500) return "normal";
    if (depth < 1000) return "deep";
    return "very_deep";
  }

  private bucketVolatility(volatility: number): string {
    if (volatility < 0.01) return "low";
    if (volatility < 0.03) return "medium";
    if (volatility < 0.05) return "high";
    return "extreme";
  }

  getFeatureFields(): string[] {
    return [
      "priceBucket",
      "momentumBucket",
      "hourBucket",
      "volumeBucket",
      "timeBucket",
      "spreadBucket",
      "depthBucket",
      "volatilityBucket",
    ];
  }
}

export const featureExtractor = new FeatureExtractor();
