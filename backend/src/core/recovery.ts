import { StateStore } from "./state";

export interface RecoveredOrder {
  id: string;
  tokenId: string;
  side: string;
  price: number;
  size: number;
}

export interface RecoveredState {
  pendingOrders: RecoveredOrder[];
  sessionPnl: number;
  slotStartTs: number;
}

export class Recovery {
  constructor(private state: StateStore) {}

  async save(recovered: RecoveredState): Promise<void> {
    await this.state.update({
      pendingOrders: recovered.pendingOrders.map((o) => ({
        orderId: o.id,
        market: o.tokenId,
        side: o.side as "buy" | "sell",
        amount: o.size,
        price: o.price,
        timestamp: Date.now(),
      })),
      sessionPnl: recovered.sessionPnl,
    });
  }

  load(): RecoveredState | null {
    const state = this.state.get();
    if (state.pendingOrders.length === 0 && state.sessionPnl === 0) return null;
    return {
      pendingOrders: state.pendingOrders.map((o) => ({
        id: o.orderId,
        tokenId: o.market,
        side: o.side,
        price: o.price,
        size: o.amount,
      })),
      sessionPnl: state.sessionPnl,
      slotStartTs: 0,
    };
  }

  async clear(): Promise<void> {
    await this.state.reset();
  }
}
