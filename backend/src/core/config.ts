export type MarketAsset = "BTC" | "ETH" | "SOL" | "XRP" | "DOGE" | "HYPE" | "BNB";

export type MarketWindow = "5m" | "15m";

export interface AssetConfig {
  symbol: string;
  binance: string;
  coinbase: string;
  okx: string;
  bybit: string;
}

export const ASSET_CONFIG: Record<MarketAsset, AssetConfig> = {
  BTC: { symbol: "BTC", binance: "BTCUSDT", coinbase: "BTC-USD", okx: "BTC-USDT", bybit: "BTCUSDT" },
  ETH: { symbol: "ETH", binance: "ETHUSDT", coinbase: "ETH-USD", okx: "ETH-USDT", bybit: "ETHUSDT" },
  SOL: { symbol: "SOL", binance: "SOLUSDT", coinbase: "SOL-USD", okx: "SOL-USDT", bybit: "SOLUSDT" },
  XRP: { symbol: "XRP", binance: "XRPUSDT", coinbase: "XRP-USD", okx: "XRP-USDT", bybit: "XRPUSDT" },
  DOGE: { symbol: "DOGE", binance: "DOGEUSDT", coinbase: "DOGE-USD", okx: "DOGE-USDT", bybit: "DOGEUSDT" },
  HYPE: { symbol: "HYPE", binance: "HYPEUSDT", coinbase: "HYPE-USD", okx: "HYPE-USDT", bybit: "HYPEUSDT" },
  BNB: { symbol: "BNB", binance: "BNBUSDT", coinbase: "BNB-USD", okx: "BNB-USDT", bybit: "BNBUSDT" },
};

const VALID_ASSETS: string[] = ["BTC", "ETH", "SOL", "XRP", "DOGE", "HYPE", "BNB"];
const VALID_WINDOWS: string[] = ["5m", "15m"];

export class Env {
  private readonly _marketAsset: MarketAsset;
  private readonly _marketWindow: MarketWindow;

  constructor(private env: Record<string, string | undefined> = process.env) {
    const rawAsset = this.env["MARKET_ASSET"] ?? "BTC";
    if (!VALID_ASSETS.includes(rawAsset)) {
      throw new Error(`Invalid MARKET_ASSET: ${rawAsset}`);
    }
    this._marketAsset = rawAsset as MarketAsset;

    const rawWindow = this.env["MARKET_WINDOW"] ?? "5m";
    if (!VALID_WINDOWS.includes(rawWindow)) {
      throw new Error(`Invalid MARKET_WINDOW: ${rawWindow}`);
    }
    this._marketWindow = rawWindow as MarketWindow;
  }

  get ticker(): boolean {
    const raw = this.env["TICKER"];
    if (raw === undefined) return true;
    return raw !== "false" && raw !== "0";
  }

  get marketAsset(): MarketAsset {
    return this._marketAsset;
  }

  get marketWindow(): MarketWindow {
    return this._marketWindow;
  }

  get privateKey(): string | undefined {
    return this.env["POLYMARKET_PRIVATE_KEY"] ?? this.env["PRIVATE_KEY"];
  }

  get polyFunderAddress(): string | undefined {
    return this.env["POLYMARKET_FUNDER"] ?? this.env["POLY_FUNDER_ADDRESS"];
  }

  get builderKey(): string | undefined {
    return this.env["POLYMARKET_API_KEY"] ?? this.env["BUILDER_KEY"];
  }

  get builderSecret(): string | undefined {
    return this.env["POLYMARKET_API_SECRET"] ?? this.env["BUILDER_SECRET"];
  }

  get builderPassphrase(): string | undefined {
    return this.env["POLYMARKET_API_PASSPHRASE"] ?? this.env["BUILDER_PASSPHRASE"];
  }

  get isProd(): boolean {
    return this.privateKey !== undefined || this.forceProd;
  }

  get assetConfig(): AssetConfig {
    return ASSET_CONFIG[this._marketAsset];
  }

  get windowSeconds(): number {
    return this._marketWindow === "5m" ? 300 : 900;
  }

  get maxSessionLoss(): number {
    const raw = this.env["MAX_SESSION_LOSS"] ?? this.env["MAX_CAP_USD"];
    if (raw === undefined) return 25;
    return Number(raw);
  }

  get walletBalance(): number {
    const raw = this.env["WALLET_BALANCE"];
    if (raw === undefined) return 1000;
    return Number(raw);
  }

  get forceProd(): boolean {
    return this.env["FORCE_PROD"] === "true";
  }
}
