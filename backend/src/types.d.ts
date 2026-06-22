declare module "*/jsonl-log.mjs" {
  export function logPath(name: string): string;
  export function appendJsonl(name: string, row: Record<string, unknown>): void;
  export function readTailJsonl(name: string, limit?: number): Record<string, unknown>[];
}

declare module "*/orderbook.mjs" {
  export function normalizeLevels(raw: unknown): Array<{ price: number; size: number }>;
  export function sortedLevels(raw: unknown, side: "bid" | "ask"): Array<{ price: number; size: number }>;
  export function bestPrice(raw: unknown, side: "bid" | "ask"): number | null;
  export function fillFromLevels(
    raw: unknown,
    side: "bid" | "ask",
    shares: number,
    limit?: number | null,
  ): {
    avgPrice: number;
    grossCost: number;
    filledShares: number;
    full: boolean;
    worstPrice: number;
    levelsConsumed: Array<{ price: number; size: number }>;
  } | null;
  export function maxFillableShares(raw: unknown, side: "bid" | "ask", limit?: number | null): number;
  export function fingerprintBook(book: unknown, depth?: number): string;
  export function bookAgeMs(book: unknown, now?: number): number | null;
}

declare module "*/fee-model.mjs" {
  export function normalizeFeeRate(rawBaseFee: unknown): number | null;
  export function calculatePolymarketFee(args: { shares: number; price: number; feeRate: number }): number | null;
  export function calculateFeePerShare(args: { price: number; feeRate: number }): number | null;
  export function calculateFeeBpsOfPayout(args: { price: number; feeRate: number }): number | null;
  export function isFeeFreeMarket(market?: Record<string, unknown>): boolean;
  export function resolveFeeRate(args: Record<string, unknown>): {
    rawBaseFee: unknown;
    normalizedFeeRate: number;
    feeRateSource: string;
  } | null;
  export function auditFeeLeg(args: Record<string, unknown>): Record<string, unknown> | null;
  export function feeRateInterpretations(rawBaseFee: unknown, opts?: { price?: number; shares?: number }): Array<Record<string, unknown>>;
  export function calculateTwoLegFeeBps(args: Record<string, unknown>): number | null;
}

declare module "*/execution-sim.mjs" {
  export function roundToTick(price: number, tickSize: number, mode?: "nearest" | "down" | "up"): number | null;
  export function estimateFee(grossCost: number, feeRateBps: unknown): number | null;
  export function estimateOfficialFee(args: Record<string, unknown>): number | null;
  export function simulateBuyLeg(book: unknown, opts: Record<string, unknown>): Record<string, unknown>;
}

declare module "*/paper-executor.mjs" {
  export function simulatePaperTrade(args: Record<string, unknown>): Record<string, unknown>;
  export function demoPaperArb(): Record<string, unknown>;
}
