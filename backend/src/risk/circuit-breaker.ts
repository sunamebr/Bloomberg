interface CircuitBreakerConfig {
  divergenceThreshold: number;
  stalenessMs: number;
}

export class CircuitBreaker {
  private _tripped = false;
  private _reason = "";

  constructor(private config: CircuitBreakerConfig) {}

  get isOpen(): boolean { return !this._tripped; }
  get isTripped(): boolean { return this._tripped; }
  get tripReason(): string { return this._reason; }

  checkDivergence(priceA: number, priceB: number): void {
    if (Math.abs(priceA - priceB) > this.config.divergenceThreshold) {
      this._tripped = true;
      this._reason = "exchange_divergence";
    }
  }

  checkStaleness(ageMs: number): void {
    if (ageMs > this.config.stalenessMs) {
      this._tripped = true;
      this._reason = "feed_stale";
    }
  }

  checkWhaleDump(changePercent: number, threshold = 0.15): void {
    if (Math.abs(changePercent) > threshold) {
      this._tripped = true;
      this._reason = "whale_dump";
    }
  }

  reset(): void {
    this._tripped = false;
    this._reason = "";
  }
}
