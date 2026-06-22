import type { MarketAsset } from "./config";

export interface SlotInfo {
  slug: string;
  start: number;
  end: number;
  windowSeconds: number;
  asset: MarketAsset;
  remaining: number;
}

export class Slot {
  constructor(private asset: MarketAsset, private windowSeconds: number) {}

  get windowSize(): number {
    return this.windowSeconds;
  }

  private get windowLabel(): string {
    return this.windowSeconds === 300 ? "5m" : "15m";
  }

  slugFor(timestamp: number): string {
    return `${this.asset}-updown-${this.windowLabel}-${timestamp}`;
  }

  currentSlotStart(now?: number): number {
    const t = Math.floor((now ?? Date.now() / 1000));
    return Math.floor(t / this.windowSeconds) * this.windowSeconds;
  }

  nextSlotStart(now?: number): number {
    return this.currentSlotStart(now) + this.windowSeconds;
  }

  end(now?: number): number {
    return this.nextSlotStart(now);
  }

  next(now?: number): Slot {
    const nextStart = this.nextSlotStart(now);
    return new Slot(this.asset, this.windowSeconds);
  }

  remaining(now?: number): number {
    const t = Math.floor((now ?? Date.now() / 1000));
    return this.nextSlotStart(now) - t;
  }

  toInfo(now?: number): SlotInfo {
    const start = this.currentSlotStart(now);
    return {
      slug: this.slugFor(start),
      start,
      end: this.nextSlotStart(now),
      windowSeconds: this.windowSeconds,
      asset: this.asset,
      remaining: this.remaining(now),
    };
  }
}
