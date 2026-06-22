import type { WalletState } from "./types";

export class Wallet {
  private _balance: number;
  private _shares = new Map<string, number>();
  private _reservedBuys = 0;

  constructor(initialBalance: number) {
    this._balance = initialBalance;
  }

  get balance(): number { return this._balance; }
  get availableBalance(): number { return this._balance - this._reservedBuys; }
  get reservedBuys(): number { return this._reservedBuys; }

  reserveBuy(amount: number): void {
    this._reservedBuys += amount;
  }

  releaseBuy(amount: number): void {
    this._reservedBuys = Math.max(0, this._reservedBuys - amount);
  }

  addShares(tokenId: string, amount: number): void {
    const current = this._shares.get(tokenId) ?? 0;
    this._shares.set(tokenId, current + amount);
  }

  removeShares(tokenId: string, amount: number): void {
    const current = this._shares.get(tokenId) ?? 0;
    this._shares.set(tokenId, Math.max(0, current - amount));
  }

  getShares(tokenId: string): number {
    return this._shares.get(tokenId) ?? 0;
  }

  onBuyFill(tokenId: string, size: number, price: number): void {
    const cost = size * price;
    this._balance -= cost;
    this._reservedBuys = Math.max(0, this._reservedBuys - cost);
    this.addShares(tokenId, size);
  }

  onSellFill(tokenId: string, size: number, price: number): void {
    const proceeds = size * price;
    this._balance += proceeds;
    this.removeShares(tokenId, size);
  }

  snapshot(): WalletState & { availableBalance: number } {
    return {
      usdcBalance: this._balance,
      availableBalance: this.availableBalance,
      reservedBuys: this._reservedBuys,
      shares: Object.fromEntries(this._shares),
    };
  }
}
