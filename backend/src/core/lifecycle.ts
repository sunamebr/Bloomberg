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
    this.log = new Logger("lifecycle:" + config.asset + ":" + config.startTs);
  }

  get slug(): string {
    return this.config.slot.slugFor(this.config.startTs);
  }

  get endTs(): number {
    return this.config.startTs + this.config.slot.windowSize;
  }

  get startTs(): number {
    return this.config.startTs;
  }

  get remaining(): number {
    return Math.max(0, this.endTs - Math.floor(Date.now() / 1000));
  }

  transition(phase: LifecyclePhase): void {
    this.log.info(this.phase + " -> " + phase);
    this.phase = phase;
    if (this.config.onPhaseChange) {
      this.config.onPhaseChange(phase);
    }
  }

  tick(now: number): void {
    const elapsed = now - this.config.startTs;
    if (this.phase === "INIT" && elapsed >= 0) {
      this.transition("RUNNING");
    } else if (this.phase === "RUNNING" && elapsed >= this.config.slot.windowSize) {
      this.transition("STOPPING");
    } else if (this.phase === "STOPPING" && elapsed >= this.config.slot.windowSize * 2) {
      this.transition("DONE");
    }
  }

  hold(): void { this.held = true; }
  release(): void { this.held = false; }
  blockBuys(): void { this.buysBlocked = true; }
  blockSells(): void { this.sellsBlocked = true; }

  get isHeld(): boolean { return this.held; }
  get isBuysBlocked(): boolean { return this.buysBlocked; }
  get isSellsBlocked(): boolean { return this.sellsBlocked; }

  set onPhaseChange(callback: ((phase: LifecyclePhase) => void) | undefined) {
    this.config.onPhaseChange = callback;
  }
}
