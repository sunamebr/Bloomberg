import { Logger } from "../../core";

const log = new Logger("booklag-calibrator");

export interface BookLagObservation {
  timestamp: number;
  market: string;
  bookLag: number;
  priceMovement: number;
  timeToMovement: number;
  profitable: boolean;
}

export interface CalibrationResult {
  totalObservations: number;
  profitableRate: number;
  avgBookLag: number;
  avgPriceMovement: number;
  avgTimeToMovement: number;
  optimalThreshold: number;
  edgeEstimate: number;
}

export class BookLagEdgeCalibrator {
  private observations: BookLagObservation[] = [];

  record(observation: BookLagObservation): void {
    this.observations.push(observation);
    log.info("BookLag observation: " + observation.market + " lag=" + observation.bookLag.toFixed(4));
  }

  calibrate(): CalibrationResult {
    if (this.observations.length === 0) {
      return {
        totalObservations: 0,
        profitableRate: 0,
        avgBookLag: 0,
        avgPriceMovement: 0,
        avgTimeToMovement: 0,
        optimalThreshold: 0,
        edgeEstimate: 0,
      };
    }

    const profitable = this.observations.filter((o) => o.profitable);
    const avgBookLag = this.observations.reduce((sum, o) => sum + o.bookLag, 0) / this.observations.length;
    const avgPriceMovement = this.observations.reduce((sum, o) => sum + Math.abs(o.priceMovement), 0) / this.observations.length;
    const avgTimeToMovement = this.observations.reduce((sum, o) => sum + o.timeToMovement, 0) / this.observations.length;

    const optimalThreshold = this.findOptimalThreshold();
    const edgeEstimate = profitable.length > 0 ? avgPriceMovement * (profitable.length / this.observations.length) : 0;

    return {
      totalObservations: this.observations.length,
      profitableRate: (profitable.length / this.observations.length) * 100,
      avgBookLag,
      avgPriceMovement,
      avgTimeToMovement,
      optimalThreshold,
      edgeEstimate,
    };
  }

  private findOptimalThreshold(): number {
    if (this.observations.length < 10) return 0;

    const sorted = [...this.observations].sort((a, b) => a.bookLag - b.bookLag);
    let bestThreshold = 0;
    let bestProfitRate = 0;

    for (let i = Math.floor(sorted.length * 0.1); i < Math.floor(sorted.length * 0.9); i++) {
      const threshold = sorted[i].bookLag;
      const above = this.observations.filter((o) => o.bookLag >= threshold);
      const profitable = above.filter((o) => o.profitable);
      const profitRate = profitable.length / above.length;

      if (profitRate > bestProfitRate && above.length >= 10) {
        bestProfitRate = profitRate;
        bestThreshold = threshold;
      }
    }

    return bestThreshold;
  }

  getObservations(): BookLagObservation[] {
    return [...this.observations];
  }

  reset(): void {
    this.observations = [];
    log.info("BookLag calibrator reset");
  }
}

export const booklagEdgeCalibrator = new BookLagEdgeCalibrator();
