import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { authRouter } from "./auth";
import { apiRouter, setWsStatus } from "./api";
import { Logger, Engine, Env } from "./core";
import { registry } from "./strategies";
import { discoverMarkets, fetchBothBooks, findMarketByAsset } from "./market/discovery";
import { MarketFeed } from "./market/feed";
import { OrderBook } from "./client";
import { Ticker } from "./client/ticker";
import { Wallet } from "./client/wallet";
import "./strategies";

const log = new Logger("boot");

async function boot(): Promise<void> {
  log.info("MestraDosTrades backend starting [asset=" + config.marketAsset + " window=" + config.marketWindow + " paper=" + config.paperMode + "]");

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
    log.info("HTTP API listening on :" + config.port);
  });

  const env = new Env(process.env);
  const orderBook = new OrderBook();
  const ticker = new Ticker();
  const wallet = new Wallet(env.walletBalance);
  let feed: MarketFeed | null = null;

  try {
    const markets = await discoverMarkets({ maxMarkets: 100 });
    const targetMarket = findMarketByAsset(markets, env.marketAsset, env.marketWindow);

    if (!targetMarket) {
      log.error("No market found for " + env.marketAsset + " " + env.marketWindow);
      setWsStatus(false);
      return;
    }

    log.info("Target market: " + targetMarket.question);
    log.info("Up token: " + targetMarket.upTokenId);
    log.info("Down token: " + targetMarket.downTokenId);

    const books = await fetchBothBooks(targetMarket);
    if (books.up) {
      orderBook.applyBook({ bids: books.up.bids, asks: books.up.asks });
      log.info("Initial book: " + books.up.bids.length + " bids, " + books.up.asks.length + " asks");
    }

    feed = new MarketFeed({
      tokenIds: [targetMarket.upTokenId, targetMarket.downTokenId],
      onOpen: () => {
        setWsStatus(true);
        log.info("Market feed connected");
      },
      onClose: () => {
        setWsStatus(false);
        log.info("Market feed disconnected");
      },
      onSnapshot: (snapshot) => {
        orderBook.applyBook({ bids: snapshot.bids, asks: snapshot.asks });
      },
      onPriceChange: (change) => {
        orderBook.applyPriceChange({
          side: change.side,
          price: change.price,
          size: change.size,
        });
      },
      onError: (error) => {
        log.error("Feed error: " + error.message);
      },
    });

    feed.connect();

    const engine = new Engine({
      env,
      onSlot: async (lifecycle) => {
        log.info("New slot: " + lifecycle.slug + " [remaining=" + lifecycle.remaining + "s]");

        for (const stratConfig of registry.all()) {
          if (!registry.isEnabled(stratConfig.name)) continue;

          try {
            const ctx = {
              postOrders: (orders: any[]) => {
                log.info("Strategy " + stratConfig.name + " posted " + orders.length + " orders");
              },
              cancelOrders: (ids: string[]) => {
                log.info("Strategy " + stratConfig.name + " cancelled " + ids.length + " orders");
              },
              emergencySells: () => {
                log.warn("Strategy " + stratConfig.name + " emergency sells");
              },
              hold: () => lifecycle.hold(),
              blockBuys: () => lifecycle.blockBuys(),
              blockSells: () => lifecycle.blockSells(),
              getMarketResult: () => null,
              orderbook: orderBook,
              ticker: ticker.snapshot(),
              slot: {
                asset: env.marketAsset,
                windowSeconds: env.windowSeconds,
                startTs: lifecycle.startTs,
                endTs: lifecycle.endTs,
                slug: lifecycle.slug,
                remaining: lifecycle.remaining,
                upTokenId: targetMarket.upTokenId,
                downTokenId: targetMarket.downTokenId,
              },
              wallet: wallet.snapshot(),
              botId: "bot-" + stratConfig.name,
            };

            const cleanup = await stratConfig.factory(ctx);
            if (cleanup) {
              lifecycle.onPhaseChange = (phase) => {
                if (phase === "DONE") cleanup();
              };
            }

            log.info("Strategy " + stratConfig.name + " started");
          } catch (error) {
            log.error("Strategy " + stratConfig.name + " failed: " + (error instanceof Error ? error.message : String(error)));
          }
        }
      },
    });

    await engine.start();
    log.info("Engine started successfully");

    process.on("SIGINT", () => {
      log.info("SIGINT received, shutting down");
      feed?.destroy();
      engine.shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      log.info("SIGTERM received, shutting down");
      feed?.destroy();
      engine.shutdown();
      process.exit(0);
    });

  } catch (error) {
    log.error("Boot failed: " + (error instanceof Error ? error.message : String(error)));
    setWsStatus(false);
    process.exit(1);
  }

  log.info("Strategy registry loaded: " + registry.list().join(", "));
}

boot().catch((err) => {
  console.error("boot failed", err);
  process.exit(1);
});


