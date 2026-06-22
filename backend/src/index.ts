import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { authRouter } from "./auth";
import { apiRouter, setWsStatus } from "./api";
import { Logger } from "./core";
import { registry } from "./strategies";
import "./strategies";

const log = new Logger("boot");

async function boot(): Promise<void> {
  log.info(`MestraDosTrades backend starting [asset=${config.marketAsset} window=${config.marketWindow} paper=${config.paperMode}]`);

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({ service: "mestrados-backend", version: "0.1.0", docs: "/api/health" });
  });

  app.use("/api", authRouter);
  app.use("/api", apiRouter);

  app.listen(config.port, () => {
    log.info(`HTTP API listening on :${config.port}`);
  });

  // Engine + WS feed: placeholders. Real boot wires the Engine class + ReconnectingWS here.
  setWsStatus(false);
  log.info(`Strategy registry loaded: ${registry.list().join(", ")}`);

  // TODO: instantiate Engine (src/core) with onSlot callback that:
  //   1. resolves current market + tokenId pair from Polymarket discovery
  //   2. populates slot.upTokenId / slot.downTokenId (see strategies/types.ts)
  //   3. dispatches to each enabled strategy from the registry
  // TODO: open ReconnectingWS to wss://ws-subscriptions-clob.polymarket.com/ws/market
  //   and route book deltas into OrderBook.applyPriceChange / applyBook.
}

boot().catch((err) => {
  console.error("boot failed", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  log.info("SIGINT received, exiting");
  process.exit(0);
});
process.on("SIGTERM", () => {
  log.info("SIGTERM received, exiting");
  process.exit(0);
});
