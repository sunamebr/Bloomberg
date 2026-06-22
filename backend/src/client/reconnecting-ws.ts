import WebSocket from "ws";

export interface ReconnectingWSOptions {
  url: string;
  onMessage: (data: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
  baseDelayMs?: number;
  maxDelayMs?: number;
  pingIntervalMs?: number;
}

export class ReconnectingWS {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private attempt = 0;
  private destroyed = false;

  constructor(private opts: ReconnectingWSOptions) {}

  connect(): void {
    if (this.destroyed) return;
    this.ws = new WebSocket(this.opts.url);

    this.ws.on("open", () => {
      this.attempt = 0;
      this.opts.onOpen?.();
      if (this.opts.pingIntervalMs) {
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            (this.ws as any).ping();
          }
        }, this.opts.pingIntervalMs);
      }
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      this.opts.onMessage(data.toString());
    });

    this.ws.on("close", () => {
      this.clearTimers();
      this.opts.onClose?.();
      this.scheduleReconnect();
    });

    this.ws.on("error", (err: Error) => {
      this.opts.onError?.(err);
    });
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    const base = this.opts.baseDelayMs ?? 1000;
    const max = this.opts.maxDelayMs ?? 30000;
    const delay = Math.min(base * Math.pow(2, this.attempt), max);
    this.attempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
  }
}
