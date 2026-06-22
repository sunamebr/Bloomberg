import { Logger } from "../core";

const log = new Logger("guard");

export interface ProductionConfig {
  enabled: boolean;
  killSwitch: boolean;
  maxDailyLossUsd: number;
  maxDailyTrades: number;
  cooldownMs: number;
  maxPositionUsd: number;
  maxBookAgeMs: number;
  maxSpreadBps: number;
  allowedStrategies: string[];
}

export interface DailyState {
  date: string;
  dailyTrades: number;
  dailyPnl: number;
  dailyDrawdown: number;
  openPositionUsd: number;
  consecutiveLosses: number;
  lastTradeAt: number;
  blockedSignals: number;
  abortReasons: Record<string, number>;
}

export interface Signal {
  strategy: string;
  market: string;
  side: string;
  size: number;
  price: number;
  bookAgeMs: number;
  spreadBps: number;
  timestamp: number;
}

export function defaultConfig(): ProductionConfig {
  return {
    enabled: process.env.REAL_PRODUCTION_ENABLED === "1",
    killSwitch: process.env.REAL_KILL_SWITCH !== "0",
    maxDailyLossUsd: Number(process.env.REAL_MAX_DAILY_LOSS_USD || 2),
    maxDailyTrades: Number(process.env.REAL_MAX_DAILY_TRADES || 20),
    cooldownMs: Number(process.env.REAL_COOLDOWN_MS || 30000),
    maxPositionUsd: Number(process.env.REAL_MAX_POSITION_USD || 3),
    maxBookAgeMs: Number(process.env.REAL_MAX_BOOK_AGE_MS || 1000),
    maxSpreadBps: Number(process.env.REAL_MAX_SPREAD_BPS || 150),
    allowedStrategies: (process.env.REAL_ALLOWED_STRATEGY || "booklag_v7_focused").split(","),
  };
}

export function emptyDailyState(): DailyState {
  return {
    date: new Date().toISOString().slice(0, 10),
    dailyTrades: 0,
    dailyPnl: 0,
    dailyDrawdown: 0,
    openPositionUsd: 0,
    consecutiveLosses: 0,
    lastTradeAt: 0,
    blockedSignals: 0,
    abortReasons: {},
  };
}

export interface GuardResult {
  allowed: boolean;
  reason: string;
  state: DailyState;
}

export function productionGuard(
  signal: Signal,
  state: DailyState,
  config: ProductionConfig = defaultConfig()
): GuardResult {
  const now = Date.now();

  // Reset daily state if new day
  const today = new Date().toISOString().slice(0, 10);
  if (state.date !== today) {
    Object.assign(state, emptyDailyState());
  }

  // Check kill switch
  if (config.killSwitch) {
    state.blockedSignals++;
    state.abortReasons["kill_switch"] = (state.abortReasons["kill_switch"] || 0) + 1;
    return { allowed: false, reason: "kill_switch_active", state };
  }

  // Check production enabled
  if (!config.enabled) {
    state.blockedSignals++;
    state.abortReasons["production_disabled"] = (state.abortReasons["production_disabled"] || 0) + 1;
    return { allowed: false, reason: "production_disabled", state };
  }

  // Check strategy allowed
  if (!config.allowedStrategies.includes(signal.strategy)) {
    state.blockedSignals++;
    state.abortReasons["strategy_not_allowed"] = (state.abortReasons["strategy_not_allowed"] || 0) + 1;
    return { allowed: false, reason: "strategy_not_allowed", state };
  }

  // Check daily loss limit
  if (state.dailyPnl <= -config.maxDailyLossUsd) {
    state.blockedSignals++;
    state.abortReasons["daily_loss_limit"] = (state.abortReasons["daily_loss_limit"] || 0) + 1;
    return { allowed: false, reason: "daily_loss_limit", state };
  }

  // Check daily trade limit
  if (state.dailyTrades >= config.maxDailyTrades) {
    state.blockedSignals++;
    state.abortReasons["daily_trade_limit"] = (state.abortReasons["daily_trade_limit"] || 0) + 1;
    return { allowed: false, reason: "daily_trade_limit", state };
  }

  // Check cooldown
  if (now - state.lastTradeAt < config.cooldownMs) {
    state.blockedSignals++;
    state.abortReasons["cooldown"] = (state.abortReasons["cooldown"] || 0) + 1;
    return { allowed: false, reason: "cooldown_active", state };
  }

  // Check position size
  const positionUsd = signal.size * signal.price;
  if (state.openPositionUsd + positionUsd > config.maxPositionUsd) {
    state.blockedSignals++;
    state.abortReasons["position_limit"] = (state.abortReasons["position_limit"] || 0) + 1;
    return { allowed: false, reason: "position_limit", state };
  }

  // Check book age
  if (signal.bookAgeMs > config.maxBookAgeMs) {
    state.blockedSignals++;
    state.abortReasons["book_stale"] = (state.abortReasons["book_stale"] || 0) + 1;
    return { allowed: false, reason: "book_stale", state };
  }

  // Check spread
  if (signal.spreadBps > config.maxSpreadBps) {
    state.blockedSignals++;
    state.abortReasons["spread_too_wide"] = (state.abortReasons["spread_too_wide"] || 0) + 1;
    return { allowed: false, reason: "spread_too_wide", state };
  }

  // Check consecutive losses
  if (state.consecutiveLosses >= 3) {
    state.blockedSignals++;
    state.abortReasons["consecutive_losses"] = (state.abortReasons["consecutive_losses"] || 0) + 1;
    return { allowed: false, reason: "consecutive_losses_limit", state };
  }

  return { allowed: true, reason: "ok", state };
}

export function recordTrade(
  state: DailyState,
  pnl: number,
  positionUsd: number
): void {
  state.dailyTrades++;
  state.dailyPnl += pnl;
  state.lastTradeAt = Date.now();
  state.openPositionUsd += positionUsd;

  if (pnl < 0) {
    state.consecutiveLosses++;
    if (state.dailyPnl < state.dailyDrawdown) {
      state.dailyDrawdown = state.dailyPnl;
    }
  } else {
    state.consecutiveLosses = 0;
  }
}

export function closePosition(state: DailyState, positionUsd: number): void {
  state.openPositionUsd = Math.max(0, state.openPositionUsd - positionUsd);
}
