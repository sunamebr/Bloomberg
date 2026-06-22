import WebSocket from "ws";
import { Logger } from "../core";

const CLOB_WS = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const log = new Logger("feed");

export interface BookSnapshot {
  tokenId: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export interface PriceChange {
  tokenId: string;
  side: "bid" | "ask";
  price: string;
  size: string;
}

export interface FeedOptions {
  tokenIds: string[];
  onSnapshot?: (snapshot: BookSnapshot) => void;
  onPriceChange?: (change: PriceChange) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  pingIntervalMs?: number;
  reconnectDelayMs?: number;
}

export class MarketFeed {
  private ws: WebSocket | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private destroyed = false;
  private opts: Required<FeedOptions>;

  constructor(opts: FeedOptions) {
    this.opts = {
      tokenIds: opts.tokenIds,
      onSnapshot: opts.onSnapshot ?? (() => {}),
      onPriceChange: opts.onPriceChange ?? (() => {}),
      onOpen: opts.onOpen ?? (() => {}),
      onClose: opts.onClose ?? (() => {}),
      onError: opts.onError ?? (() => {}),
      pingIntervalMs: opts.pingIntervalMs ?? 30000,
      reconnectDelayMs: opts.reconnectDelayMs ?? 5000,
    };
  }

  connect(): void {
    if (this.destroyed) return;

    log.info("Connecting to " + CLOB_WS + " for " + this.opts.tokenIds.length + " tokens");
    this.ws = new WebSocket(CLOB_WS);

    this.ws.on("open", () => {
      log.info("WebSocket connected");
      this.opts.onOpen();

      const subscribeMsg = {
        assets_ids: this.opts.tokenIds,
        type: "market",
        custom_feature_enabled: true,
      };
      this.ws?.send(JSON.stringify(subscribeMsg));
      log.info("Subscribed to " + this.opts.tokenIds.length + " assets");

      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          try {
            this.ws.send("PING");
          } catch (error) {
            log.error("Ping failed: " + (error instanceof Error ? error.message : String(error)));
          }
        }
      }, this.opts.pingIntervalMs);
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      try {
        const message = data.toString();
        if (message === "PONG") return;

        const events = JSON.parse(message);
        const eventArray = Array.isArray(events) ? events : [events];

        for (const event of eventArray) {
          this.handleEvent(event);
        }
      } catch (error) {
        log.error("Message parse error: " + (error instanceof Error ? error.message : String(error)));
      }
    });

    this.ws.on("close", () => {
      log.info("WebSocket closed");
      this.clearTimers();
      this.opts.onClose();
      this.scheduleReconnect();
    });

    this.ws.on("error", (error: Error) => {
      log.error("WebSocket error: " + error.message);
      this.opts.onError(error);
    });
  }

  private handleEvent(event: Record<string, unknown>): void {
    const type = event.event_type || event.type;
    const tokenId = event.asset_id || event.assetId;

    if (!tokenId || !this.opts.tokenIds.includes(String(tokenId))) return;

    if (type === "book_snapshot") {
      this.opts.onSnapshot({
        tokenId: String(tokenId),
        bids: (event.bids || []) as Array<{ price: string; size: string }>,
        asks: (event.asks || []) as Array<{ price: string; size: string }>,
      });
    } else if (type === "price_change") {
      const changes = (event.changes || event.price_changes || []) as Array<{
        side: string;
        price: string;
        size: string;
      }>;

      for (const change of changes) {
        this.opts.onPriceChange({
          tokenId: String(tokenId),
          side: change.side.toUpperCase() === "SELL" ? "ask" : "bid",
          price: change.price,
          size: change.size,
        });
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;

    log.info("Reconnecting in " + this.opts.reconnectDelayMs + "ms");
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.opts.reconnectDelayMs);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    log.info("Feed destroyed");
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
