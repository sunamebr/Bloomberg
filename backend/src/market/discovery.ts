import { Logger } from "../core";

const GAMMA_HOST = process.env.POLYMARKET_GAMMA_HOST || "https://gamma-api.polymarket.com";
const CLOB_HOST = process.env.POLYMARKET_CLOB_HOST || "https://clob.polymarket.com";

const log = new Logger("discovery");

export interface MarketToken {
  tokenId: string;
  outcome: string;
}

export interface DiscoveredMarket {
  marketId: string;
  conditionId: string;
  question: string;
  category: string;
  tags: string[];
  slug: string;
  outcomes: string[];
  tokens: MarketToken[];
  upTokenId: string;
  downTokenId: string;
  tickSize: number;
  active: boolean;
  closed: boolean;
  endDate: string;
  volume24hr: number;
  liquidity: number;
}

export interface OrderBook {
  tokenId: string;
  assetId: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
  receivedAt: number;
}

function jsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeBinaryMarket(market: Record<string, unknown>): DiscoveredMarket | null {
  const outcomes = jsonArray(market?.outcomes) as string[];
  const tokenIds = jsonArray(market?.clobTokenIds) as string[];
  const closed = market?.closed === true || String(market?.closed) === "true";
  const active = market?.active === true || String(market?.active) === "true";
  const paused = market?.acceptingOrders === false || market?.enableOrderBook === false;

  if (!active || closed || paused || tokenIds.length !== 2 || outcomes.length !== 2) {
    return null;
  }

  const tags = jsonArray(market.tags) as string[];
  const upTokenId = tokenIds[0];
  const downTokenId = tokenIds[1];

  return {
    marketId: String(market.id || market.market || market.slug || ""),
    conditionId: String(market.conditionId || ""),
    question: String(market.question || ""),
    category: String(market.category || ""),
    tags,
    slug: String(market.slug || ""),
    outcomes,
    tokens: [
      { tokenId: upTokenId, outcome: outcomes[0] },
      { tokenId: downTokenId, outcome: outcomes[1] },
    ],
    upTokenId,
    downTokenId,
    tickSize: Number(market.tickSize || 0.01),
    active,
    closed,
    endDate: String(market.endDate || ""),
    volume24hr: Number(market.volume24hr || 0),
    liquidity: Number(market.liquidity || 0),
  };
}

export async function discoverMarkets(opts: { maxMarkets?: number } = {}): Promise<DiscoveredMarket[]> {
  const maxMarkets = opts.maxMarkets ?? 50;
  const url = new URL("/markets", GAMMA_HOST);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", String(Math.max(maxMarkets * 3, maxMarkets)));
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      log.error("Gamma API error: " + response.status + " " + response.statusText);
      return [];
    }

    const rows = await response.json();
    const markets = (Array.isArray(rows) ? rows : [])
      .map(normalizeBinaryMarket)
      .filter((m): m is DiscoveredMarket => m !== null)
      .slice(0, maxMarkets);

    log.info("Discovered " + markets.length + " active binary markets");
    return markets;
  } catch (error) {
    log.error("Market discovery failed: " + (error instanceof Error ? error.message : String(error)));
    return [];
  }
}

export async function fetchOrderBook(tokenId: string): Promise<OrderBook | null> {
  const url = new URL("/book", CLOB_HOST);
  url.searchParams.set("token_id", tokenId);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      log.error("CLOB book error: " + response.status + " for " + tokenId);
      return null;
    }

    const raw = await response.json() as { asset_id?: string; bids?: Array<{ price: string; size: string }>; asks?: Array<{ price: string; size: string }>; buy?: Array<{ price: string; size: string }>; sell?: Array<{ price: string; size: string }>; timestamp?: number };
    const receivedAt = Date.now();

    return {
      tokenId,
      assetId: String(raw.asset_id || tokenId),
      bids: raw.bids || raw.buy || [],
      asks: raw.asks || raw.sell || [],
      timestamp: Number(raw.timestamp || receivedAt),
      receivedAt,
    };
  } catch (error) {
    log.error("Order book fetch failed for " + tokenId + ": " + (error instanceof Error ? error.message : String(error)));
    return null;
  }
}

export async function fetchBothBooks(market: DiscoveredMarket): Promise<{ up: OrderBook | null; down: OrderBook | null }> {
  const [up, down] = await Promise.all([
    fetchOrderBook(market.upTokenId),
    fetchOrderBook(market.downTokenId),
  ]);
  return { up, down };
}

export function findMarketByAsset(markets: DiscoveredMarket[], asset: string, window: string): DiscoveredMarket | null {
  const slug = asset.toLowerCase() + "-" + window;
  return markets.find((m) => m.slug.includes(slug) || m.question.toLowerCase().includes(asset.toLowerCase() + " " + window)) || null;
}

