import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../../../.env") });
loadDotenv();

export interface AppConfig {
  port: number;
  logLevel: string;
  paperMode: boolean;
  maxCapUsd: number;
  marketAsset: string;
  marketWindow: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  wallet: {
    watchAddress?: string;
    pUsdAddress: string;
    usdcAddress: string;
    usdcEAddress: string;
  };
  polymarket: {
    clobHost: string;
    privateKey?: string;
    apiKey?: string;
    apiSecret?: string;
    apiPassphrase?: string;
    funder?: string;
    sigType: number;
    polygonRpcUrl?: string;
  };
}

function num(env: string | undefined, fallback: number): number {
  const n = Number(env);
  return Number.isFinite(n) ? n : fallback;
}

export const config: AppConfig = {
  port: num(process.env.PORT, 3001),
  logLevel: process.env.LOG_LEVEL ?? "info",
  paperMode: String(process.env.PAPER_MODE ?? "true").toLowerCase() !== "false",
  maxCapUsd: num(process.env.MAX_CAP_USD, 25),
  marketAsset: process.env.MARKET_ASSET ?? "BTC",
  marketWindow: process.env.MARKET_WINDOW ?? "5m",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  db: {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: num(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER ?? "mestra",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE ?? "mestrados",
  },
  wallet: {
    watchAddress: process.env.WALLET_ADDRESS,
    pUsdAddress: process.env.POLYMARKET_PUSD_ADDRESS ?? "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB",
    usdcAddress: process.env.POLYGON_USDC_ADDRESS ?? "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    usdcEAddress: process.env.POLYGON_USDCE_ADDRESS ?? "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  polymarket: {
    clobHost: process.env.POLYMARKET_CLOB_HOST ?? "https://clob.polymarket.com",
    privateKey: process.env.POLYMARKET_PRIVATE_KEY,
    apiKey: process.env.POLYMARKET_API_KEY,
    apiSecret: process.env.POLYMARKET_API_SECRET,
    apiPassphrase: process.env.POLYMARKET_API_PASSPHRASE,
    funder: process.env.POLYMARKET_FUNDER,
    sigType: num(process.env.POLYMARKET_SIG_TYPE, 3),
    polygonRpcUrl: process.env.POLYGON_RPC_URL,
  },
};
