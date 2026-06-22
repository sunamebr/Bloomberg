import { Env } from "./config";
import { Slot } from "./slot";
import { StateStore } from "./state";
import { Recovery } from "./recovery";
import { ProcessLock } from "./process-lock";
import { MarketLifecycle } from "./lifecycle";
import { Logger } from "./logger";

export interface EngineOptions {
  env: Env;
  stateDir?: string;
  onSlot?: (lifecycle: MarketLifecycle) => Promise<void>;
}

export class Engine {
  private env: Env;
  private slot: Slot;
  private state: StateStore;
  private recovery: Recovery;
  private lock: ProcessLock;
  private running = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private stateInterval: ReturnType<typeof setInterval> | null = null;
  private currentLifecycle: MarketLifecycle | null = null;
  private sessionPnl = 0;
  private log: Logger;
  private onSlot: ((lifecycle: MarketLifecycle) => Promise<void>) | null;

  constructor(opts: EngineOptions) {
    this.env = opts.env;
    this.slot = new Slot(opts.env.marketAsset, opts.env.windowSeconds);
    const stateDir = opts.stateDir ?? `state/${opts.env.isProd ? "prod" : "sim"}`;
    this.state = new StateStore(`${stateDir}/engine.json`);
    this.recovery = new Recovery(this.state);
    this.lock = new ProcessLock(stateDir);
    this.onSlot = opts.onSlot ?? null;
    this.log = new Logger("engine");
  }

  async start(): Promise<void> {
    if (!this.lock.acquire()) {
      this.log.error("Another engine instance is running");
      process.exit(1);
    }

    await this.state.init();

    const recovered = this.recovery.load();
    if (recovered) {
      this.sessionPnl = recovered.sessionPnl;
      this.log.info(`Recovered session PnL: ${this.sessionPnl}`);
    }

    this.running = true;
    this.log.info(`Engine started [${this.env.marketAsset} ${this.env.marketWindow}] ${this.env.isProd ? "PROD" : "PAPER"}`);

    this.tickInterval = setInterval(() => this.tick(), 100);
    this.stateInterval = setInterval(() => this.persistState(), 5000);

    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  private tick(): void {
    if (!this.running) return;

    const now = Math.floor(Date.now() / 1000);
    const currentTs = now - (now % this.slot.windowSize);

    if (!this.currentLifecycle || this.currentLifecycle.phase === "DONE") {
      this.currentLifecycle = new MarketLifecycle({
        slot: this.slot,
        asset: this.env.marketAsset,
        startTs: currentTs,
        onPhaseChange: (phase) => {
          if (phase === "DONE") this.recovery.clear();
        },
      });
      this.onSlot?.(this.currentLifecycle);
    }

    this.currentLifecycle.tick(now);

    if (this.sessionPnl < -this.env.maxSessionLoss) {
      this.log.error(`Session loss limit reached: ${this.sessionPnl}`);
      this.shutdown();
    }
  }

  private persistState(): void {
    this.recovery.save({
      pendingOrders: [],
      sessionPnl: this.sessionPnl,
      slotStartTs: this.currentLifecycle ? this.currentLifecycle.endTs - this.slot.windowSize : 0,
    });
  }

  recordPnl(amount: number): void {
    this.sessionPnl += amount;
  }

  shutdown(): void {
    if (!this.running) return;
    this.running = false;
    this.log.info("Shutting down...");
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.stateInterval) clearInterval(this.stateInterval);
    this.persistState();
    this.lock.release();
    this.log.info("Engine stopped");
  }
}
