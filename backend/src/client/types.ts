export interface OrderRequest {
  tokenId: string;
  price: number;
  size: number;
  side: "BUY" | "SELL";
  orderType: "GTC" | "FOK" | "GTD";
  expiration?: number;
}

export interface PendingOrder {
  id: string;
  request: OrderRequest;
  status: "PENDING" | "MATCHED" | "MINED" | "CANCELLED";
  filledSize: number;
  createdAt: number;
}

export interface FillEvent {
  orderId: string;
  tradeId: string;
  price: number;
  size: number;
  side: "BUY" | "SELL";
  timestamp: number;
}

export interface TickerSnapshot {
  btc: number | null;
  eth: number | null;
  polymarket: number | null;
  lastUpdate: number;
}

export interface WalletState {
  usdcBalance: number;
  shares: Record<string, number>;
  reservedBuys: number;
}
