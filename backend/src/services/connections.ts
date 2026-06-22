import { createPublicClient, http } from "viem";
import { polygon } from "viem/chains";
import { config } from "../config";
import { pingDb } from "../db";
import { getWalletSnapshot, resolveWalletAddress } from "./wallet";

export type ConnectionStatus = "ok" | "warn" | "error";

export interface ConnectionItem {
  id: string;
  label: string;
  status: ConnectionStatus;
  detail: string;
  latencyMs?: number;
  checkedAt: string;
}

export interface ConnectionReport {
  generatedAt: string;
  connections: ConnectionItem[];
}

interface WsStatus {
  connected: boolean;
  lastMessageAt: number | null;
}

const DEFAULT_POLYGON_RPC = "https://polygon-bor-rpc.publicnode.com";

function item(id: string, label: string, status: ConnectionStatus, detail: string, startedAt: number): ConnectionItem {
  return {
    id,
    label,
    status,
    detail,
    latencyMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };
}

async function checkDb(): Promise<ConnectionItem> {
  const started = Date.now();
  try {
    const ok = await pingDb();
    return item("mysql", "MariaDB / ledger", ok ? "ok" : "error", ok ? "connected" : "unreachable", started);
  } catch (err) {
    return item("mysql", "MariaDB / ledger", "error", err instanceof Error ? err.message : String(err), started);
  }
}

async function checkPolygonRpc(): Promise<ConnectionItem> {
  const started = Date.now();
  try {
    const client = createPublicClient({
      chain: polygon,
      transport: http(config.polymarket.polygonRpcUrl || DEFAULT_POLYGON_RPC),
    });
    const block = await client.getBlockNumber();
    return item("polygon_rpc", "Polygon RPC", "ok", `block ${block.toString()}`, started);
  } catch (err) {
    return item("polygon_rpc", "Polygon RPC", "error", err instanceof Error ? err.message : String(err), started);
  }
}

async function checkClobRest(): Promise<ConnectionItem> {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(config.polymarket.clobHost, { signal: controller.signal });
    clearTimeout(timeout);
    const status = response.ok || response.status < 500 ? "ok" : "warn";
    return item("polymarket_clob_rest", "Polymarket CLOB REST", status, `HTTP ${response.status}`, started);
  } catch (err) {
    return item("polymarket_clob_rest", "Polymarket CLOB REST", "error", err instanceof Error ? err.message : String(err), started);
  }
}

async function checkWallet(address?: string): Promise<ConnectionItem> {
  const started = Date.now();
  try {
    const wallet = await getWalletSnapshot(address);
    if (!wallet.configured || !wallet.address) return item("wallet", "Wallet balance", "warn", "wallet address missing", started);
    const pUsd = wallet.balances.find((balance) => balance.id === "pusd");
    const status = wallet.errors.length ? "warn" : "ok";
    return item("wallet", "Wallet balance", status, `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} / pUSD ${pUsd?.amount ?? "0"}`, started);
  } catch (err) {
    return item("wallet", "Wallet balance", "error", err instanceof Error ? err.message : String(err), started);
  }
}

function checkClobCredentials(): ConnectionItem {
  const started = Date.now();
  const hasPrivateKey = Boolean(config.polymarket.privateKey);
  const hasFunder = Boolean(config.polymarket.funder);
  const hasCreds = Boolean(config.polymarket.apiKey && config.polymarket.apiSecret && config.polymarket.apiPassphrase);
  const derived = resolveWalletAddress();

  if (!hasPrivateKey && !derived.address) return item("wallet_credentials", "Signer / funder config", "warn", "no signer or funder configured", started);
  if (!hasFunder && Number(config.polymarket.sigType) !== 0) return item("wallet_credentials", "Signer / funder config", "warn", "funder missing for proxy signature", started);
  return item("wallet_credentials", "Signer / funder config", "ok", hasCreds ? "CLOB API creds present" : "can derive CLOB API key", started);
}

function checkLiveSigner(): ConnectionItem {
  const started = Date.now();
  const enabled = process.env.LIVE_SIGNER_ENABLED === "1";
  const killSwitchOn = String(process.env.LIVE_SIGNER_KILL_SWITCH ?? "1") !== "0";
  if (!enabled) return item("live_signer", "Live signer", "warn", "disabled", started);
  if (killSwitchOn) return item("live_signer", "Live signer", "warn", "kill switch on", started);
  return item("live_signer", "Live signer", "ok", "armed", started);
}

function checkWs(wsStatus: WsStatus): ConnectionItem {
  const started = Date.now();
  if (wsStatus.connected) return item("polymarket_ws", "Polymarket market WS", "ok", "connected", started);
  return item("polymarket_ws", "Polymarket market WS", "warn", "not started", started);
}

export async function getConnectionReport(wsStatus: WsStatus, address?: string): Promise<ConnectionReport> {
  const [db, polygonRpc, clobRest, wallet] = await Promise.all([
    checkDb(),
    checkPolygonRpc(),
    checkClobRest(),
    checkWallet(address),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    connections: [
      item("backend_api", "Backend API", "ok", "serving", Date.now()),
      db,
      polygonRpc,
      clobRest,
      checkWs(wsStatus),
      wallet,
      checkClobCredentials(),
      checkLiveSigner(),
    ],
  };
}
