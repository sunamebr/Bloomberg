import { Router, type Request, type Response } from "express";
import { config } from "../config";
import { registry } from "../strategies";
import { authenticateToken } from "../auth";
import { getOpenPositions, getRecentSignals, getLedger, getOperationHistory } from "../db";
import { pingDb } from "../db/pool";
import { readTailJsonl } from "../lib/jsonl-log.mjs";
import { getWalletSnapshot } from "../services/wallet";
import { getConnectionReport } from "../services/connections";

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

apiRouter.get("/wallet", async (req: Request, res: Response) => {
  try {
    const wallet = await getWalletSnapshot(typeof req.query.address === "string" ? req.query.address : undefined);
    res.json({ wallet });
  } catch (err) {
    res.status(502).json({ error: "wallet_unavailable", detail: String(err) });
  }
});

apiRouter.get("/connections", async (req: Request, res: Response) => {
  try {
    const report = await getConnectionReport(wsStatus, typeof req.query.address === "string" ? req.query.address : undefined);
    res.json(report);
  } catch (err) {
    res.status(502).json({ error: "connections_unavailable", detail: String(err) });
  }
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

apiRouter.get("/operations", async (req: Request, res: Response) => {
  const limit = clampLimit(req.query.limit, 100, 500);
  try {
    const operations = await getOperationHistory(limit);
    res.json({ operations });
  } catch {
    const fallback = readTailJsonl("ledger.jsonl", limit);
    res.json({ operations: fallback, source: "jsonl_fallback" });
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

apiRouter.get("/scanner", (_req: Request, res: Response) => {
  const { scanner } = require("../scanner");
  res.json(scanner.getState());
});

apiRouter.get("/scanner/watchlist", (_req: Request, res: Response) => {
  const { watchlist } = require("../scanner/watchlist");
  res.json({ persistent: watchlist.getPersistent(), all: watchlist.getAll() });
});

apiRouter.get("/production/state", (_req: Request, res: Response) => {
  const { productionState } = require("../production/state");
  res.json({ today: productionState.getTodayStats(), equity: productionState.getEquity(), drawdown: productionState.getDrawdown() });
});

apiRouter.get("/production/failures", (_req: Request, res: Response) => {
  const { failureAnalysis } = require("../production/failure-analysis");
  res.json({ stats: failureAnalysis.getStats(), recent: failureAnalysis.getRecentEvents() });
});

apiRouter.get("/alpha/metrics", (_req: Request, res: Response) => {
  const { alphaLab } = require("../alpha/lab");
  res.json({ metrics: alphaLab.getMetrics(), top: alphaLab.getTopStrategies() });
});

apiRouter.get("/arena/ranking", (_req: Request, res: Response) => {
  const { botScorer } = require("../arena/scoring");
  res.json({ ranking: botScorer.getRanking(), top: botScorer.getTopBots() });
});

apiRouter.get("/arena/evolution", (_req: Request, res: Response) => {
  const { evolution } = require("../arena/evolution");
  res.json({ generation: evolution.getGeneration(), population: evolution.getPopulation(), top: evolution.getTopIndividuals() });
});

apiRouter.get("/learning/features", (_req: Request, res: Response) => {
  const { featureExtractor } = require("../learning/features");
  res.json({ fields: featureExtractor.getFeatureFields() });
});

apiRouter.get("/assistant/alerts", (_req: Request, res: Response) => {
  const { tradeAssistant } = require("../assistant");
  res.json(tradeAssistant.getState());
});

function clampLimit(raw: unknown, def: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

