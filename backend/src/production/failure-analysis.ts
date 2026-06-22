import { Logger } from "../core";

const log = new Logger("failure-analysis");

export type FailureType = 
  | "book_stale"
  | "spread_too_wide"
  | "position_limit"
  | "daily_loss_limit"
  | "consecutive_losses"
  | "cooldown_active"
  | "strategy_not_allowed"
  | "execution_failed"
  | "network_error"
  | "unknown";

export interface FailureEvent {
  type: FailureType;
  strategy: string;
  market: string;
  reason: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface FailureStats {
  type: FailureType;
  count: number;
  lastOccurrence: number;
  affectedStrategies: string[];
}

export class FailureAnalysis {
  private events: FailureEvent[] = [];
  private stats: Map<FailureType, FailureStats> = new Map();

  record(event: FailureEvent): void {
    this.events.push(event);

    let stats = this.stats.get(event.type);
    if (!stats) {
      stats = {
        type: event.type,
        count: 0,
        lastOccurrence: 0,
        affectedStrategies: [],
      };
      this.stats.set(event.type, stats);
    }

    stats.count++;
    stats.lastOccurrence = event.timestamp;
    
    if (!stats.affectedStrategies.includes(event.strategy)) {
      stats.affectedStrategies.push(event.strategy);
    }

    log.warn("Failure recorded: " + event.type + " - " + event.reason);
  }

  classify(reason: string): FailureType {
    const lower = reason.toLowerCase();
    
    if (lower.includes("book") || lower.includes("stale")) return "book_stale";
    if (lower.includes("spread")) return "spread_too_wide";
    if (lower.includes("position")) return "position_limit";
    if (lower.includes("daily") || lower.includes("loss")) return "daily_loss_limit";
    if (lower.includes("consecutive")) return "consecutive_losses";
    if (lower.includes("cooldown")) return "cooldown_active";
    if (lower.includes("strategy") || lower.includes("allowed")) return "strategy_not_allowed";
    if (lower.includes("execution") || lower.includes("order")) return "execution_failed";
    if (lower.includes("network") || lower.includes("connection")) return "network_error";
    
    return "unknown";
  }

  getStats(): FailureStats[] {
    return Array.from(this.stats.values()).sort((a, b) => b.count - a.count);
  }

  getRecentEvents(limit: number = 50): FailureEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getEventsByType(type: FailureType): FailureEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getTopFailureType(): FailureType | null {
    const stats = this.getStats();
    return stats.length > 0 ? stats[0].type : null;
  }

  reset(): void {
    this.events = [];
    this.stats.clear();
    log.info("Failure analysis reset");
  }
}

export const failureAnalysis = new FailureAnalysis();
