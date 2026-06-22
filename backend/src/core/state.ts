import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface PendingOrder {
  orderId: string;
  market: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: number;
}

export interface PersistedState {
  pendingOrders: PendingOrder[];
  sessionPnl: number;
  lastUpdated: number;
}

function defaults(): PersistedState {
  return { pendingOrders: [], sessionPnl: 0, lastUpdated: Date.now() };
}

export class StateStore {
  private state: PersistedState = defaults();

  constructor(private filePath: string) {}

  async init(): Promise<void> {
    this.state = await this.load();
  }

  private async load(): Promise<PersistedState> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as PersistedState;
      return {
        pendingOrders: Array.isArray(parsed.pendingOrders) ? parsed.pendingOrders : [],
        sessionPnl: typeof parsed.sessionPnl === "number" ? parsed.sessionPnl : 0,
        lastUpdated: typeof parsed.lastUpdated === "number" ? parsed.lastUpdated : Date.now(),
      };
    } catch {
      return defaults();
    }
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + ".tmp";
    await writeFile(tmp, JSON.stringify(this.state, null, 2), "utf-8");
    await rename(tmp, this.filePath);
  }

  get(): PersistedState {
    return JSON.parse(JSON.stringify(this.state));
  }

  async update(partial: Partial<PersistedState>): Promise<void> {
    this.state = { ...this.state, ...partial, lastUpdated: Date.now() };
    await this.save();
  }

  async addPendingOrder(order: PendingOrder): Promise<void> {
    this.state.pendingOrders.push(order);
    this.state.lastUpdated = Date.now();
    await this.save();
  }

  async removePendingOrder(orderId: string): Promise<void> {
    this.state.pendingOrders = this.state.pendingOrders.filter((o) => o.orderId !== orderId);
    this.state.lastUpdated = Date.now();
    await this.save();
  }

  async updateSessionPnl(pnl: number): Promise<void> {
    this.state.sessionPnl = pnl;
    this.state.lastUpdated = Date.now();
    await this.save();
  }

  async reset(): Promise<void> {
    this.state = defaults();
    await this.save();
  }
}
