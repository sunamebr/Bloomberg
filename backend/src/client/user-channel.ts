export type ChannelEvent =
  | { type: "MATCHED"; orderId: string; tradeId: string; price: number; size: number; side: "BUY" | "SELL" }
  | { type: "MINED"; orderId: string; tradeId: string }
  | { type: "CANCELLED"; orderId: string; reason: string };

export type ChannelHandler = (event: ChannelEvent) => void;

export interface UserChannel {
  subscribe(handler: ChannelHandler): void;
  unsubscribe(): void;
  destroy(): void;
}
