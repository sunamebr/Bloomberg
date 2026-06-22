import { Logger } from "../core";

const log = new Logger("copytrading");

export interface WalletTrade {
  wallet: string;
  tokenId: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  timestamp: number;
}

export interface TradeFilter {
  minSize: number;
  maxSize: number;
  maxAgeMinutes: number;
  allowedSides: ("BUY" | "SELL")[];
  minPrice: number;
  maxPrice: number;
}

export interface CopyOrder {
  tokenId: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  sourceWallet: string;
}

export class Copier {
  constructor(private config: { maxSize: number; filter: TradeFilter }) {}

  evaluate(trade: WalletTrade): CopyOrder | null {
    const ageMinutes = (Date.now() - trade.timestamp) / 60000;

    if (trade.size < this.config.filter.minSize) return null;
    if (trade.size > this.config.filter.maxSize) return null;
    if (ageMinutes > this.config.filter.maxAgeMinutes) return null;
    if (!this.config.filter.allowedSides.includes(trade.side)) return null;
    if (trade.price < this.config.filter.minPrice || trade.price > this.config.filter.maxPrice) return null;

    const size = Math.min(trade.size, this.config.maxSize);
    if (size <= 0) return null;

    return {
      tokenId: trade.tokenId,
      side: trade.side,
      price: trade.price,
      size,
      sourceWallet: trade.wallet,
    };
  }
}

export class WalletTracker {
  private trades: WalletTrade[] = [];
  private wallets: Set<string> = new Set();

  addWallet(wallet: string): void {
    this.wallets.add(wallet);
    log.info("Tracking wallet: " + wallet);
  }

  removeWallet(wallet: string): void {
    this.wallets.delete(wallet);
    log.info("Stopped tracking wallet: " + wallet);
  }

  recordTrade(trade: WalletTrade): void {
    if (this.wallets.has(trade.wallet)) {
      this.trades.push(trade);
      log.info("Wallet trade: " + trade.wallet + " " + trade.side + " " + trade.size + " @ " + trade.price);
    }
  }

  getRecentTrades(limit: number = 50): WalletTrade[] {
    return this.trades.slice(-limit).reverse();
  }

  getWalletTrades(wallet: string, limit: number = 20): WalletTrade[] {
    return this.trades.filter((t) => t.wallet === wallet).slice(-limit).reverse();
  }

  getTrackedWallets(): string[] {
    return Array.from(this.wallets);
  }
}

export const walletTracker = new WalletTracker();
