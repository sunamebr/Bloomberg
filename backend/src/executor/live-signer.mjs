import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chain, ClobClient, OrderType, Side } from '@polymarket/clob-client-v2';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { appendJsonl } from '../lib/jsonl-log.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const STATE_FILE = path.join(ROOT, 'logs', 'live-signer-state.json');
const HOST = 'https://clob.polymarket.com';

export const DEFAULT_ALLOWED_STRATEGY = process.env.LIVE_SIGNER_ALLOWED_STRATEGY || 'cheap_contrarian_longshot_refined';

export const LIVE_SIGNER_DEFAULTS = {
  LIVE_SIGNER_ENABLED: '0',
  LIVE_SIGNER_KILL_SWITCH: '1',
  LIVE_SIGNER_ALLOWED_STRATEGY: DEFAULT_ALLOWED_STRATEGY,
  LIVE_SIGNER_MAX_CAPITAL_USD: process.env.LIVE_SIGNER_MAX_CAPITAL_USD || '3',
  LIVE_SIGNER_MAX_TRADE_USD: process.env.LIVE_SIGNER_MAX_TRADE_USD || '0.10',
  LIVE_SIGNER_MAX_DAILY_LOSS_USD: process.env.LIVE_SIGNER_MAX_DAILY_LOSS_USD || '3.00',
  LIVE_SIGNER_MAX_DAILY_TRADES: process.env.LIVE_SIGNER_MAX_DAILY_TRADES || '20',
  LIVE_SIGNER_MAX_OPEN_POSITIONS: process.env.LIVE_SIGNER_MAX_OPEN_POSITIONS || '1',
  LIVE_SIGNER_ALLOWED_ASSETS: process.env.LIVE_SIGNER_ALLOWED_ASSETS || 'ETH,BTC,SOL',
  LIVE_SIGNER_ALLOWED_WINDOW_TYPE: process.env.LIVE_SIGNER_ALLOWED_WINDOW_TYPE || '5m',
  LIVE_SIGNER_MIN_PRICE: process.env.LIVE_SIGNER_MIN_PRICE || '0.08',
  LIVE_SIGNER_MAX_PRICE: process.env.LIVE_SIGNER_MAX_PRICE || '0.12',
  LIVE_SIGNER_MIN_REVERSAL_SCORE: process.env.LIVE_SIGNER_MIN_REVERSAL_SCORE || '25',
  LIVE_SIGNER_MAX_REVERSAL_SCORE: process.env.LIVE_SIGNER_MAX_REVERSAL_SCORE || '50',
  LIVE_SIGNER_MIN_LIQUIDITY: process.env.LIVE_SIGNER_MIN_LIQUIDITY || '100',
  LIVE_SIGNER_MAX_BOOK_AGE_MS: process.env.LIVE_SIGNER_MAX_BOOK_AGE_MS || '50',
  LIVE_SIGNER_MAX_SPREAD: process.env.LIVE_SIGNER_MAX_SPREAD || '0.02',
  LIVE_SIGNER_ORDER_TYPE: process.env.LIVE_SIGNER_ORDER_TYPE || 'GTC',
  POLYMARKET_SIG_TYPE: process.env.POLYMARKET_SIG_TYPE || '3',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberEnv(env, key) {
  const n = Number(env[key] ?? LIVE_SIGNER_DEFAULTS[key]);
  return Number.isFinite(n) ? n : Number(LIVE_SIGNER_DEFAULTS[key]);
}

function listEnv(env, key) {
  return String(env[key] ?? LIVE_SIGNER_DEFAULTS[key]).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
}

function boolEnabled(env, key, enabledValue = '1') {
  return String(env[key] ?? LIVE_SIGNER_DEFAULTS[key]) === enabledValue;
}

export function liveSignerFlags(env = process.env) {
  return {
    enabled: boolEnabled(env, 'LIVE_SIGNER_ENABLED', '1'),
    killSwitch: String(env.LIVE_SIGNER_KILL_SWITCH ?? LIVE_SIGNER_DEFAULTS.LIVE_SIGNER_KILL_SWITCH) !== '0',
    allowedStrategy: String(env.LIVE_SIGNER_ALLOWED_STRATEGY ?? LIVE_SIGNER_DEFAULTS.LIVE_SIGNER_ALLOWED_STRATEGY),
    maxCapitalUsd: numberEnv(env, 'LIVE_SIGNER_MAX_CAPITAL_USD'),
    maxTradeUsd: numberEnv(env, 'LIVE_SIGNER_MAX_TRADE_USD'),
    maxDailyLossUsd: numberEnv(env, 'LIVE_SIGNER_MAX_DAILY_LOSS_USD'),
    maxDailyTrades: numberEnv(env, 'LIVE_SIGNER_MAX_DAILY_TRADES'),
    maxOpenPositions: numberEnv(env, 'LIVE_SIGNER_MAX_OPEN_POSITIONS'),
    allowedAssets: listEnv(env, 'LIVE_SIGNER_ALLOWED_ASSETS'),
    allowedWindowType: String(env.LIVE_SIGNER_ALLOWED_WINDOW_TYPE ?? LIVE_SIGNER_DEFAULTS.LIVE_SIGNER_ALLOWED_WINDOW_TYPE),
    minPrice: numberEnv(env, 'LIVE_SIGNER_MIN_PRICE'),
    maxPrice: numberEnv(env, 'LIVE_SIGNER_MAX_PRICE'),
    minReversalScore: numberEnv(env, 'LIVE_SIGNER_MIN_REVERSAL_SCORE'),
    maxReversalScore: numberEnv(env, 'LIVE_SIGNER_MAX_REVERSAL_SCORE'),
    minLiquidity: numberEnv(env, 'LIVE_SIGNER_MIN_LIQUIDITY'),
    maxBookAgeMs: numberEnv(env, 'LIVE_SIGNER_MAX_BOOK_AGE_MS'),
    maxSpread: numberEnv(env, 'LIVE_SIGNER_MAX_SPREAD'),
    orderType: String(env.LIVE_SIGNER_ORDER_TYPE ?? LIVE_SIGNER_DEFAULTS.LIVE_SIGNER_ORDER_TYPE).toUpperCase(),
  };
}

export function emptyLiveSignerState(date = today()) {
  return {
    date,
    dailyTrades: 0,
    dailyRealizedPnlUsd: 0,
    totalCapitalAtRiskUsd: 0,
    openPositions: [],
    consecutiveLosses: 0,
    lastTradeUsd: 0,
    lastOrderAt: null,
    riskEvents: [],
  };
}

export function loadLiveSignerState(file = STATE_FILE) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed?.date === today()) return { ...emptyLiveSignerState(parsed.date), ...parsed };
  } catch {}
  return emptyLiveSignerState();
}

export function saveLiveSignerState(state, file = STATE_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function normalizePrivateKey(env = process.env) {
  const raw = String(env.POLYMARKET_PRIVATE_KEY || env.PRIVATE_KEY || '').trim();
  if (!raw) return '';
  return raw.startsWith('0x') ? raw : `0x${raw}`;
}

function funderForSignature(env = process.env) {
  const sigType = Number(env.POLYMARKET_SIG_TYPE ?? LIVE_SIGNER_DEFAULTS.POLYMARKET_SIG_TYPE);
  if ([1, 2, 3].includes(sigType) && !env.POLYMARKET_FUNDER) return '';
  return env.POLYMARKET_FUNDER || undefined;
}

function envCreds(env = process.env) {
  const key = env.POLYMARKET_CLOB_API_KEY || env.POLYMARKET_API_KEY;
  const secret = env.POLYMARKET_CLOB_SECRET || env.POLYMARKET_API_SECRET;
  const passphrase = env.POLYMARKET_CLOB_PASSPHRASE || env.POLYMARKET_API_PASSPHRASE;
  return key && secret && passphrase ? { key, secret, passphrase } : null;
}

export function sanitizeForLog(value) {
  const secretKeys = /private|secret|passphrase|api[_-]?key|signature/i;
  if (Array.isArray(value)) return value.map((x) => sanitizeForLog(x));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = secretKeys.test(key) ? '[REDACTED]' : sanitizeForLog(val);
    }
    return out;
  }
  if (typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value)) return '[REDACTED]';
  return value;
}

function reject(reason, details = {}) {
  return { ok: false, reason, details };
}

export function buildOrderIntent({ signal = {}, tradeUsd, flags = liveSignerFlags() } = {}) {
  const price = Number(signal.cheapContrarianPrice ?? signal.liveQuotePrice ?? signal.price);
  const sizeUsd = Number(tradeUsd ?? signal.sizeUsd ?? flags.maxTradeUsd);
  const shares = price > 0 ? Math.floor((sizeUsd / price) * 10000) / 10000 : 0;
  return {
    signerMode: 'LIVE_SIGNER',
    strategy: signal.strategy,
    marketId: String(signal.marketId || ''),
    tokenId: String(signal.tokenId || ''),
    asset: String(signal.asset || '').toUpperCase(),
    windowType: String(signal.windowType || ''),
    side: 'BUY',
    outcomeSide: String(signal.cheapContrarianSide ?? signal.side ?? '').toUpperCase(),
    price,
    sizeUsd,
    shares,
    orderType: flags.orderType,
    postOnly: true,
    reduceOnly: false,
    noMartingale: true,
    noSizeIncrease: true,
  };
}

export function liveSignerGuard({
  signal = {},
  state = emptyLiveSignerState(),
  env = process.env,
  tradeUsd,
  now = Date.now(),
} = {}) {
  const flags = liveSignerFlags(env);
  const intent = buildOrderIntent({ signal, tradeUsd, flags });
  const spread = Number(signal.spread ?? signal.currentBestAsk - signal.currentBestBid);
  const liquidity = Number(signal.liquidity ?? 0);
  const bookAgeMs = Number(signal.bookAgeMs ?? 0);
  const reversalScore = Number(signal.reversalScore);
  const dailyLoss = Math.abs(Math.min(0, Number(state.dailyRealizedPnlUsd || 0)));

  const allowedStrategy = String(env.LIVE_SIGNER_ALLOWED_STRATEGY ?? DEFAULT_ALLOWED_STRATEGY);

  if (!flags.enabled) return reject('live_signer_disabled', { flags, intent });
  if (flags.killSwitch) return reject('kill_switch_on', { flags, intent });
  if (!normalizePrivateKey(env)) return reject('private_key_missing', { flags, intent });
  if (!funderForSignature(env)) return reject('polymarket_funder_missing', { flags, intent });
  if (signal.strategy !== flags.allowedStrategy || signal.strategy !== allowedStrategy) return reject('strategy_not_allowlisted', { flags, intent });
  if (intent.windowType !== flags.allowedWindowType) return reject('window_type_not_allowed', { flags, intent });
  if (!flags.allowedAssets.includes(intent.asset)) return reject('asset_not_allowed', { flags, intent });
  if (!(intent.price >= flags.minPrice && intent.price <= flags.maxPrice)) return reject('price_out_of_range', { flags, intent });
  if (!(reversalScore >= flags.minReversalScore && reversalScore <= flags.maxReversalScore)) return reject('reversal_score_out_of_range', { flags, intent, reversalScore });
  if (!(intent.sizeUsd > 0) || intent.sizeUsd > flags.maxTradeUsd) return reject('max_trade_usd_exceeded', { flags, intent });
  if (state.lastTradeUsd > 0 && intent.sizeUsd > state.lastTradeUsd) return reject('size_increase_blocked', { flags, intent, lastTradeUsd: state.lastTradeUsd });
  if (state.dailyTrades >= flags.maxDailyTrades) return reject('max_daily_trades_exceeded', { flags, intent });
  if (dailyLoss >= flags.maxDailyLossUsd) return reject('max_daily_loss_exceeded', { flags, intent, dailyLoss });
  if (state.totalCapitalAtRiskUsd + intent.sizeUsd > flags.maxCapitalUsd) return reject('max_capital_usd_exceeded', { flags, intent, totalCapitalAtRiskUsd: state.totalCapitalAtRiskUsd });
  if ((state.openPositions || []).length >= flags.maxOpenPositions) return reject('max_open_positions_exceeded', { flags, intent });
  if (Number(state.consecutiveLosses || 0) >= 3) return reject('max_consecutive_losses_exceeded', { flags, intent });
  if (!intent.tokenId) return reject('token_id_missing', { flags, intent });
  if (!intent.marketId) return reject('market_id_missing', { flags, intent });
  if (!(liquidity >= flags.minLiquidity)) return reject('liquidity_too_low', { flags, intent, liquidity });
  if (!(bookAgeMs <= flags.maxBookAgeMs)) return reject('book_stale', { flags, intent, bookAgeMs });
  if (!(spread >= 0 && spread <= flags.maxSpread)) return reject('spread_too_wide', { flags, intent, spread });
  if (String(signal.quoteStableAcrossChecks) !== 'true' && signal.quoteStableAcrossChecks !== true) return reject('quote_not_stable', { flags, intent });
  if (intent.orderType !== 'GTC') return reject('unsupported_order_type', { flags, intent });
  if (!(intent.shares > 0)) return reject('size_too_small_for_price', { flags, intent });

  return {
    ok: true,
    reason: '',
    flags,
    intent,
    riskChecks: {
      strategyAllowlist: true,
      killSwitch: false,
      maxCapitalUsd: true,
      maxTradeUsd: true,
      maxDailyLossUsd: true,
      maxOpenPositions: true,
      noMartingale: true,
      noSizeIncrease: true,
      asset: true,
      windowType: true,
      priceRange: true,
      reversalScoreRange: true,
      bookFresh: true,
      spread: true,
      liquidity: true,
      quoteStable: true,
      checkedAt: new Date(now).toISOString(),
    },
  };
}

export async function createLiveClobClient(env = process.env) {
  const privateKey = normalizePrivateKey(env);
  if (!privateKey) throw new Error('POLYMARKET_PRIVATE_KEY missing');
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(env.POLYGON_RPC_URL || undefined),
  });
  const signatureType = Number(env.POLYMARKET_SIG_TYPE ?? LIVE_SIGNER_DEFAULTS.POLYMARKET_SIG_TYPE);
  const builderCode = env.POLYMARKET_BUILDER_CODE || undefined;
  const base = {
    host: HOST,
    chain: Chain.POLYGON,
    signer: walletClient,
    signatureType,
    funderAddress: funderForSignature(env),
    builderConfig: builderCode ? { builderCode } : undefined,
    throwOnError: true,
  };
  const creds = envCreds(env);
  if (creds) return new ClobClient({ ...base, creds });
  const l1 = new ClobClient(base);
  const derived = await l1.deriveApiKey();
  if (!derived?.key || !derived?.secret || !derived?.passphrase) throw new Error('CLOB API credential derivation failed');
  return new ClobClient({ ...base, creds: { key: derived.key, secret: derived.secret, passphrase: derived.passphrase } });
}

export async function postLiveLimitBuy({ client, intent, marketOptions = {} }) {
  const order = {
    tokenID: intent.tokenId,
    price: intent.price,
    size: intent.shares,
    side: Side.BUY,
  };
  const options = {
    tickSize: String(marketOptions.tickSize || marketOptions.tick_size || '0.01'),
    negRisk: Boolean(marketOptions.negRisk ?? marketOptions.neg_risk ?? false),
  };
  return client.createAndPostOrder(order, options, OrderType.GTC, true);
}

export async function executeLiveSigner({
  signal,
  tradeUsd,
  env = process.env,
  state = loadLiveSignerState(),
  stateFile = STATE_FILE,
  clientFactory = createLiveClobClient,
  postOrderFn = postLiveLimitBuy,
} = {}) {
  const guard = liveSignerGuard({ signal, state, env, tradeUsd });
  const eventBase = {
    mode: 'LIVE_SIGNER_REAL',
    strategy: signal?.strategy,
    marketId: signal?.marketId,
    tokenId: signal?.tokenId,
    asset: signal?.asset,
    windowType: signal?.windowType,
  };
  if (!guard.ok) {
    const riskEvent = sanitizeForLog({ ...eventBase, eventType: 'live_signer_blocked', abortReason: guard.reason, details: guard.details });
    appendJsonl('live-signer-risk-events.jsonl', riskEvent);
    state.riskEvents = [...(state.riskEvents || []), { timestamp: new Date().toISOString(), abortReason: guard.reason }].slice(-50);
    saveLiveSignerState(state, stateFile);
    return { ok: false, abortReason: guard.reason, riskEvent, state: sanitizeForLog(state) };
  }

  const orderIntent = guard.intent;
  appendJsonl('live-signer-orders.jsonl', sanitizeForLog({ ...eventBase, eventType: 'live_order_intent', orderIntent, riskChecks: guard.riskChecks }));
  const client = await clientFactory(env);
  const orderResponse = await postOrderFn({ client, intent: orderIntent, marketOptions: signal.marketOptions || signal });
  const orderRecord = sanitizeForLog({
    ...eventBase,
    eventType: 'live_order_response',
    orderIntent,
    orderResponse,
    riskChecks: guard.riskChecks,
  });
  appendJsonl('live-signer-orders.jsonl', orderRecord);
  appendJsonl('live-signer-trades.jsonl', sanitizeForLog({
    ...eventBase,
    eventType: 'live_trade_pending_reconcile',
    orderIntent,
    orderResponse,
    fillStatus: orderResponse?.status || 'submitted',
    note: 'Position/fill reconciliation is manual until an explicit reconciler is implemented.',
  }));

  state.dailyTrades += 1;
  state.lastTradeUsd = orderIntent.sizeUsd;
  state.totalCapitalAtRiskUsd += orderIntent.sizeUsd;
  state.lastOrderAt = new Date().toISOString();
  state.openPositions.push({
    marketId: orderIntent.marketId,
    tokenId: orderIntent.tokenId,
    asset: orderIntent.asset,
    windowType: orderIntent.windowType,
    sizeUsd: orderIntent.sizeUsd,
    price: orderIntent.price,
    orderId: orderResponse?.orderID || orderResponse?.orderId || null,
    status: orderResponse?.status || 'submitted',
  });
  saveLiveSignerState(state, stateFile);
  return { ok: true, orderRecord, state: sanitizeForLog(state) };
}
