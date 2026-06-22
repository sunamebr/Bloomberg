const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export interface User {
  id: number;
  username: string;
  role: string;
  email?: string | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface HealthResponse {
  ok: boolean;
  db: boolean;
  paperMode: boolean;
  ts: number;
  ws: {
    connected: boolean;
    lastMessageAt: number | null;
  };
}

export interface StrategyStatus {
  name: string;
  description: string;
  enabled: boolean;
}

export interface StatusResponse {
  paperMode: boolean;
  capital: {
    maxCapUsd: number;
    asset: string;
    window: string;
  };
  strategies: StrategyStatus[];
}

export interface PositionRow {
  id: number;
  user_id: number;
  market_id: string;
  token_id: string;
  asset: string;
  window_type: string;
  side: string;
  shares: number;
  avg_price: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface SignalRow {
  id?: number;
  strategy: string;
  asset: string;
  window_type: string;
  market_id: string;
  token_id: string;
  side: string;
  price: number;
  size_usd: number;
  confidence: number | null;
  created_at?: string;
}

export interface LedgerRow {
  id?: number;
  user_id: number | null;
  strategy: string;
  asset: string;
  window_type: string;
  market_id: string;
  token_id: string;
  side: string;
  shares: number;
  price: number;
  fee_usd: number;
  pnl_usd: number | null;
  mode: string;
  created_at?: string;
}

export interface TokenBalance {
  id: "pol" | "pusd" | "usdc" | "usdce";
  label: string;
  symbol: string;
  address: string | null;
  decimals: number;
  raw: string;
  amount: string;
  ok: boolean;
  error?: string;
}

export interface WalletSnapshot {
  configured: boolean;
  address: string | null;
  signerAddress: string | null;
  funderAddress: string | null;
  source: "query" | "wallet_address" | "funder" | "private_key" | "none";
  chain: "polygon";
  rpcUrl: string;
  balances: TokenBalance[];
  updatedAt: string;
  errors: string[];
}

export interface ConnectionItem {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
  latencyMs?: number;
  checkedAt: string;
}

export interface ConnectionReport {
  generatedAt: string;
  connections: ConnectionItem[];
}

export interface OperationRow {
  id?: number;
  kind?: "ledger";
  strategy: string;
  asset: string;
  window_type: string;
  market_id: string;
  token_id: string;
  side: string;
  shares: number;
  price: number;
  fee_usd: number;
  pnl_usd: number | null;
  mode: string;
  created_at?: string;
}

class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(init.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = payload?.error || payload?.message || "request_failed";
    throw new ApiError(String(error), response.status, payload);
  }

  return payload as T;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const data = await request<{ token: string; user: User }>("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return { success: true, token: data.token, user: data.user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "network_error",
    };
  }
}

export async function logout(): Promise<void> {
  try {
    if (getToken()) {
      await request("/logout", { method: "POST" });
    }
  } finally {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;

  try {
    const data = await request<{ user: User }>("/me");
    return data.user;
  } catch {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>("/status");
}

export async function getPositions(limit = 100): Promise<PositionRow[]> {
  const data = await request<{ positions: PositionRow[] }>(`/positions?limit=${limit}`);
  return data.positions;
}

export async function getSignals(limit = 100): Promise<SignalRow[]> {
  const data = await request<{ signals: SignalRow[] }>(`/signals?limit=${limit}`);
  return data.signals;
}

export async function getLedger(limit = 200): Promise<LedgerRow[]> {
  const data = await request<{ ledger: LedgerRow[] }>(`/ledger?limit=${limit}`);
  return data.ledger;
}

function queryAddress(address?: string | null): string {
  return address ? `&address=${encodeURIComponent(address)}` : "";
}

export async function getWallet(address?: string | null): Promise<WalletSnapshot> {
  const data = await request<{ wallet: WalletSnapshot }>(`/wallet?x=1${queryAddress(address)}`);
  return data.wallet;
}

export function getConnections(address?: string | null): Promise<ConnectionReport> {
  return request<ConnectionReport>(`/connections?x=1${queryAddress(address)}`);
}

export async function getOperations(limit = 100): Promise<OperationRow[]> {
  const data = await request<{ operations: OperationRow[] }>(`/operations?limit=${limit}`);
  return data.operations;
}

export function toggleStrategy(id: string, enable: boolean): Promise<{ id: string; enabled: boolean }> {
  return request<{ id: string; enabled: boolean }>(`/strategy/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
    body: JSON.stringify({ enable }),
  });
}

export function toggleMode(): Promise<{ paperMode: boolean; warning: string }> {
  return request<{ paperMode: boolean; warning: string }>("/mode/toggle", {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}
