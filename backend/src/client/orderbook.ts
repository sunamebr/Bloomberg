import { PriceLevelMap } from "./price-level-map";

interface BookLevel {
  price: string;
  size: string;
}

interface BookSnapshot {
  bids: BookLevel[];
  asks: BookLevel[];
}

interface PriceChange {
  side: "bid" | "ask";
  price: string;
  size: string;
}

export class OrderBook {
  private bids = new PriceLevelMap();
  private asks = new PriceLevelMap();
  private _lastUpdate = 0;

  applyBook(snapshot: BookSnapshot): void {
    this.bids.clear();
    this.asks.clear();
    for (const { price, size } of snapshot.bids) {
      this.bids.set(Number(price), Number(size));
    }
    for (const { price, size } of snapshot.asks) {
      this.asks.set(Number(price), Number(size));
    }
    this._lastUpdate = Date.now();
  }

  applyPriceChange(change: PriceChange): void {
    const map = change.side === "bid" ? this.bids : this.asks;
    const price = Number(change.price);
    const size = Number(change.size);
    if (size <= 0) {
      map.delete(price);
    } else {
      map.set(price, size);
    }
    this._lastUpdate = Date.now();
  }

  get bestBid(): number | undefined { return this.bids.bestBid(); }
  get bestAsk(): number | undefined { return this.asks.bestAsk(); }

  get spread(): number | null {
    const bid = this.bestBid;
    const ask = this.bestAsk;
    if (bid == null || ask == null) return null;
    return ask - bid;
  }

  get mid(): number | null {
    const bid = this.bestBid;
    const ask = this.bestAsk;
    if (bid == null || ask == null) return null;
    return (bid + ask) / 2;
  }

  get lastUpdate(): number { return this._lastUpdate; }
  get age(): number { return Date.now() - this._lastUpdate; }

  bidDepth(levels: number): number {
    return this.bids.topN(levels, true).reduce((sum, [, size]) => sum + size, 0);
  }

  askDepth(levels: number): number {
    return this.asks.topN(levels).reduce((sum, [, size]) => sum + size, 0);
  }

  bidLevels(n: number): [number, number][] {
    return this.bids.topN(n, true);
  }

  askLevels(n: number): [number, number][] {
    return this.asks.topN(n);
  }

  snapshot() {
    return {
      bids: this.bids.entries(),
      asks: this.asks.entries(),
      bestBid: this.bestBid,
      bestAsk: this.bestAsk,
      spread: this.spread,
      mid: this.mid,
      age: this.age,
    };
  }
}
