import { Slot } from "./slot";
import { Logger } from "./logger";

export type LifecyclePhase = "INIT" | "RUNNING" | "STOPPING" | "DONE";

export interface LifecycleConfig {
  slot: Slot;
  asset: string;
  startTs: number;
  onPhaseChange?: (phase: LifecyclePhase) => void;
}

export class MarketLifecycle {
  phase: LifecyclePhase = "INIT";
  private log: Logger;
  private held = false;
  private buysBlocked = false;
  private sellsBlocked = false;

  constructor(private config: LifecycleConfig) {
    this.log = new Logger(`lifecycle:${config.asset}:${config.startTs}`);
  }

  get slug(): string {
    return this.config.slot.slugFor(this.config.startTs);
  }

  get endTs(): number {
    return this.config.startTs + this.config.slot.windowSize;
  }

  get remaining(): number {
    return Math.max(0, this.endTs - Math.floor(Date.now() / 1000));
  }

  transition(phase: LifecyclePhase): void {
    this.log.info(`${this.phase} → ${phase}`);
    this.phase = phase;
    this.config.onPhaseChange?.(phase);
  }

  hold(): void { this.held = true; }
  release(): void { this.held = false; }
  blockBuys(): void { this.buysBlocked = true; }
  blockSells(): void { this.sellsBlocked = true; }

  get isHeld(): boolean { return this.held; }
  get isBuysBlocked(): boolean { return this.buysBlocked; }
  get isSellsBlocked(): boolean { return this.sellsBlocked; }

  shouldStop(now: number): boolean {
    if (this.held) return false;
    return now >= this.endTs;
  }

  tick(now: number): void {
    if (this.phase === "INIT") {
      this.transition("RUNNING");
    } else if (this.phase === "RUNNING" && this.shouldStop(now)) {
      this.transition("STOPPING");
    }
  }
}
