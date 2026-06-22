import mysql, { type Pool, type PoolOptions } from "mysql2/promise";
import { config } from "../config";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const opts: PoolOptions = {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: "Z",
  };
  pool = mysql.createPool(opts);
  return pool;
}

export async function pingDb(): Promise<boolean> {
  try {
    const p = getPool();
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
