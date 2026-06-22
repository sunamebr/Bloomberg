import { Router, type Request, type Response } from "express";
import { config } from "../config";
import { registry } from "../strategies";
import { authenticateToken } from "../auth";
import { getOpenPositions, getRecentSignals, getLedger } from "../db";
import { pingDb } from "../db/pool";
import { readTailJsonl } from "../lib/jsonl-log.mjs";

export const apiRouter = Router();

let wsStatus: { connected: boolean; lastMessageAt: number | null } = {
  connected: false,
  lastMessageAt: null,
};

export function setWsStatus(connected: boolean): void {
  wsStatus = { connected, lastMessageAt: connected ? Date.now() : wsStatus.lastMessageAt };
}

apiRouter.get("/health", async (_req: Request, res: Response) => {
  const db = await pingDb();
  res.json({ ok: true, db, ws: wsStatus, paperMode: config.paperMode, ts: Date.now() });
});

apiRouter.get("/status", (_req: Request, res: Response) => {
  res.json({
    paperMode: config.paperMode,
    capital: { maxCapUsd: config.maxCapUsd, asset: config.marketAsset, window: config.marketWindow },
    strategies: registry.status(),
  });
});

apiRouter.get("/positions", async (req: Request, res: Response) => {
  const limit = clampLimit(req.query.limit, 100, 500);
  try {
    const positions = await getOpenPositions(limit);
    res.json({ positions });
  } catch (err) {
    res.status(502).json({ error: "db_unavailable", positions: [], detail: String(err) });
  }
});

apiRouter.get("/signals", async (req: Request, res: Response) => {
  const limit = clampLimit(req.query.limit, 50, 500);
  try {
    const signals = await getRecentSignals(limit);
    res.json({ signals });
  } catch {
    const fallback = readTailJsonl("signals.jsonl", limit);
    res.json({ signals: fallback, source: "jsonl_fallback" });
  }
});

apiRouter.get("/ledger", async (req: Request, res: Response) => {
  const limit = clampLimit(req.query.limit, 200, 1000);
  try {
    const ledger = await getLedger(limit);
    res.json({ ledger });
  } catch {
    const fallback = readTailJsonl("ledger.jsonl", limit);
    res.json({ ledger: fallback, source: "jsonl_fallback" });
  }
});

apiRouter.post("/strategy/:id/toggle", authenticateToken, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const enable = req.body?.enable ?? !registry.isEnabled(id);
  const ok = registry.setEnabled(id, Boolean(enable));
  if (!ok) {
    res.status(404).json({ error: "strategy_not_found", id });
    return;
  }
  res.json({ id, enabled: registry.isEnabled(id) });
});

apiRouter.post("/mode/toggle", authenticateToken, (req: Request, res: Response) => {
  const confirm = req.body?.confirm === true || req.body?.confirm === "true";
  if (!confirm) {
    res.status(422).json({
      error: "confirmation_required",
      message: "Pass body { confirm: true } to switch paper <-> live.",
    });
    return;
  }
  const nextMode = !config.paperMode;
  config.paperMode = nextMode;
  res.json({ paperMode: nextMode, warning: nextMode ? "switched_to_paper" : "switched_to_live_real_funds_at_risk" });
});

function clampLimit(raw: unknown, def: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}
