import { Logger } from "../core";
import type { ArbOpportunity } from "./index";

const log = new Logger("watchlist");

export interface WatchlistEntry {
  marketId: string;
  question: string;
  edgePct: number;
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
  persistent: boolean;
}

export class Watchlist {
  private entries: Map<string, WatchlistEntry> = new Map();
  private minOccurrencesForAlert: number;
  private persistenceThresholdMs: number;

  constructor(opts: { minOccurrences?: number; persistenceMs?: number } = {}) {
    this.minOccurrencesForAlert = opts.minOccurrences ?? 3;
    this.persistenceThresholdMs = opts.persistenceMs ?? 60000;
  }

  update(opportunity: ArbOpportunity): void {
    const existing = this.entries.get(opportunity.marketId);
    const now = Date.now();

    if (existing) {
      existing.lastSeen = now;
      existing.occurrences++;
      existing.edgePct = opportunity.edgePct;
      existing.persistent = 
        existing.occurrences >= this.minOccurrencesForAlert &&
        now - existing.firstSeen >= this.persistenceThresholdMs;
      
      if (existing.persistent && existing.occurrences === this.minOccurrencesForAlert) {
        log.info("Persistent opportunity: " + existing.marketId + " edge=" + existing.edgePct.toFixed(2) + "%");
      }
    } else {
      this.entries.set(opportunity.marketId, {
        marketId: opportunity.marketId,
        question: opportunity.marketId,
        edgePct: opportunity.edgePct,
        firstSeen: now,
        lastSeen: now,
        occurrences: 1,
        persistent: false,
      });
    }

    this.prune();
  }

  private prune(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;

    for (const [id, entry] of this.entries.entries()) {
      if (now - entry.lastSeen > maxAge) {
        this.entries.delete(id);
      }
    }
  }

  getPersistent(): WatchlistEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.persistent)
      .sort((a, b) => b.edgePct - a.edgePct);
  }

  getAll(): WatchlistEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.edgePct - a.edgePct);
  }

  getEntry(marketId: string): WatchlistEntry | null {
    return this.entries.get(marketId) || null;
  }

  getCount(): number {
    return this.entries.size;
  }

  getPersistentCount(): number {
    return this.getPersistent().length;
  }

  reset(): void {
    this.entries.clear();
    log.info("Watchlist reset");
  }
}

export const watchlist = new Watchlist();
