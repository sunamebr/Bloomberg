import type { Pool } from "mysql2/promise";
import { getPool } from "./pool";

export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  role: string;
  created_at: Date;
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
  opened_at: Date;
  closed_at: Date | null;
}

export interface SignalRow {
  id: number;
  strategy: string;
  asset: string;
  window_type: string;
  market_id: string;
  token_id: string;
  side: string;
  price: number;
  size_usd: number;
  confidence: number | null;
  created_at: Date;
}

export interface LedgerRow {
  id: number;
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
  created_at: Date;
}

function pool(): Pool {
  return getPool();
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const [rows] = await pool().query(
    "SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = ? LIMIT 1",
    [username],
  );
  const list = rows as UserRow[];
  return list[0] ?? null;
}

export async function getUserById(id: number): Promise<Omit<UserRow, "password_hash"> | null> {
  const [rows] = await pool().query(
    "SELECT id, username, email, role, created_at FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  const list = rows as Array<Omit<UserRow, "password_hash">>;
  return list[0] ?? null;
}

export async function insertSignal(s: Omit<SignalRow, "id" | "created_at">): Promise<number> {
  const [res] = await pool().query(
    `INSERT INTO signals (strategy, asset, window_type, market_id, token_id, side, price, size_usd, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.strategy, s.asset, s.window_type, s.market_id, s.token_id, s.side, s.price, s.size_usd, s.confidence],
  );
  return (res as { insertId: number }).insertId;
}

export async function insertPosition(p: Omit<PositionRow, "id" | "opened_at" | "closed_at">): Promise<number> {
  const [res] = await pool().query(
    `INSERT INTO positions (user_id, market_id, token_id, asset, window_type, side, shares, avg_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.user_id, p.market_id, p.token_id, p.asset, p.window_type, p.side, p.shares, p.avg_price, p.status],
  );
  return (res as { insertId: number }).insertId;
}

export async function getOpenPositions(limit = 100): Promise<PositionRow[]> {
  const [rows] = await pool().query(
    "SELECT * FROM positions WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT ?",
    [limit],
  );
  return rows as PositionRow[];
}

export async function getRecentSignals(limit = 50): Promise<SignalRow[]> {
  const [rows] = await pool().query(
    "SELECT * FROM signals ORDER BY created_at DESC LIMIT ?",
    [limit],
  );
  return rows as SignalRow[];
}

export async function getLedger(limit = 200): Promise<LedgerRow[]> {
  const [rows] = await pool().query(
    "SELECT * FROM ledger ORDER BY created_at DESC LIMIT ?",
    [limit],
  );
  return rows as LedgerRow[];
}
