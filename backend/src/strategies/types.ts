import type { OrderBook, TickerSnapshot, WalletState, OrderRequest } from "../client";

export interface SlotInfo {
  asset: string;
  windowSeconds: number;
  startTs: number;
  endTs: number;
  slug: string;
  remaining: number;
  // TODO: Polymarket uses two distinct tokenId fields per binary market.
  // Up/Down (or Yes/No) tokens are NOT derivable from `asset` by string concat.
  // Engine must populate `upTokenId` and `downTokenId` from market discovery.
  upTokenId?: string;
  downTokenId?: string;
}

export interface StrategyContext {
  postOrders(orders: OrderRequest[]): void;
  cancelOrders(ids: string[]): void;
  emergencySells(): void;
  hold(): void;
  blockBuys(): void;
  blockSells(): void;
  getMarketResult(): { open: number; close: number } | null;
  orderbook: OrderBook;
  ticker: TickerSnapshot;
  slot: SlotInfo;
  wallet: WalletState;
  botId: string;
}

export type StrategyCleanup = () => void;
export type Strategy = (ctx: StrategyContext) => Promise<StrategyCleanup | void>;

export interface StrategyConfig {
  name: string;
  description: string;
  factory: Strategy;
}
