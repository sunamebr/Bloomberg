export { liveSignerFlags, liveSignerGuard, buildOrderIntent, executeLiveSigner, createLiveClobClient, postLiveLimitBuy, normalizePrivateKey, sanitizeForLog, loadLiveSignerState, saveLiveSignerState, emptyLiveSignerState, DEFAULT_ALLOWED_STRATEGY, LIVE_SIGNER_DEFAULTS } from './live-signer.mjs';

// TODO: port production/dry-run.mjs and production/maker-dry-run.mjs from TradeMarket.
// They depend on collectors/live-arb-collector and alpha/strategies which were NOT
// copied (out of scope for 5min BTC Up/Down minimum viable backend). Re-implement
// a leaner dry-run path here once the new engine feeds signals in.
