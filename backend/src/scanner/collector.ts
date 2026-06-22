import { Logger } from "../core";
import { discoverMarkets, fetchBothBooks, type DiscoveredMarket } from "../market/discovery";
import { scanner, type ArbOpportunity } from "./index";

const log = new Logger("collector");

export interface CollectorOptions {
  intervalMs: number;
  maxMarkets: number;
  nearEdgeBps: number;
  dryRun: boolean;
}

export interface CollectorState {
  running: boolean;
  cycleCount: number;
  lastCycleAt: number;
  marketsScanned: number;
  opportunitiesFound: number;
  nearArbCount: number;
  positiveArbCount: number;
}

export class Collector {
  private state: CollectorState = {
    running: false,
    cycleCount: 0,
    lastCycleAt: 0,
    marketsScanned: 0,
    opportunitiesFound: 0,
    nearArbCount: 0,
    positiveArbCount: 0,
  };

  private intervalId: NodeJS.Timeout | null = null;
  private opts: CollectorOptions;

  constructor(opts: Partial<CollectorOptions> = {}) {
    this.opts = {
      intervalMs: opts.intervalMs ?? 1000,
      maxMarkets: opts.maxMarkets ?? 50,
      nearEdgeBps: opts.nearEdgeBps ?? 10,
      dryRun: opts.dryRun ?? true,
    };
  }

  async start(): Promise<void> {
    if (this.state.running) {
      log.warn("Collector already running");
      return;
    }

    log.info("Starting collector [interval=" + this.opts.intervalMs + "ms, maxMarkets=" + this.opts.maxMarkets + "]");
    this.state.running = true;

    await this.runCycle();

    this.intervalId = setInterval(() => this.runCycle(), this.opts.intervalMs);
  }

  stop(): void {
    if (!this.state.running) return;

    log.info("Stopping collector");
    this.state.running = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runCycle(): Promise<void> {
    try {
      const startTime = Date.now();
      this.state.cycleCount++;
      this.state.lastCycleAt = startTime;

      const markets = await discoverMarkets({ maxMarkets: this.opts.maxMarkets });
      if (markets.length === 0) {
        log.warn("No markets discovered");
        return;
      }

      this.state.marketsScanned = markets.length;

      const opportunities: ArbOpportunity[] = [];

      for (const market of markets) {
        const opp = await this.scanMarket(market);
        if (opp) {
          opportunities.push(opp);
        }
      }

      this.state.opportunitiesFound = opportunities.length;

      const scannerState = scanner.getState();
      this.state.nearArbCount = scannerState.nearArbCount;
      this.state.positiveArbCount = scannerState.positiveArbCount;

      const elapsed = Date.now() - startTime;
      log.info(
        "Cycle " + this.state.cycleCount + ": scanned " + markets.length + " markets, " +
        opportunities.length + " opportunities, " + this.state.positiveArbCount + " positive arb, " +
        this.state.nearArbCount + " near arb [" + elapsed + "ms]"
      );

    } catch (error) {
      log.error("Collector cycle failed: " + (error instanceof Error ? error.message : String(error)));
    }
  }

  private async scanMarket(market: DiscoveredMarket): Promise<ArbOpportunity | null> {
    try {
      const books = await fetchBothBooks(market);

      if (!books.up || !books.down) {
        return null;
      }

      const opportunity = scanner.scanBinaryArb(
        market.marketId,
        books.up,
        books.down
      );

      if (opportunity?.detected) {
        log.info(
          "POSITIVE ARB: " + market.question + " " +
          "[upAsk=" + opportunity.upAsk.toFixed(4) + ", downAsk=" + opportunity.downAsk.toFixed(4) + ", " +
          "edge=" + opportunity.edgePct.toFixed(2) + "%]"
        );
      }

      return opportunity;
    } catch (error) {
      log.error("Scan failed for " + market.marketId + ": " + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  getState(): CollectorState {
    return { ...this.state };
  }

  getTopOpportunities(limit: number = 10): ArbOpportunity[] {
    return scanner.getTopOpportunities(limit);
  }

  getNearArbOpportunities(): ArbOpportunity[] {
    return scanner.getNearArbOpportunities(this.opts.nearEdgeBps);
  }

  getPositiveArbOpportunities(): ArbOpportunity[] {
    return scanner.getPositiveArbOpportunities();
  }
}

export const collector = new Collector();
