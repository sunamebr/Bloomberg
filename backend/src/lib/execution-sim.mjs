import { bestPrice, bookAgeMs, fillFromLevels, fingerprintBook, maxFillableShares } from './orderbook.mjs';
import { auditFeeLeg, calculatePolymarketFee, resolveFeeRate } from './fee-model.mjs';

export function roundToTick(price, tickSize, mode = 'nearest') {
  const p = Number(price);
  const t = Number(tickSize);
  if (!(p > 0) || !(t > 0)) return null;
  const q = p / t;
  const rounded = mode === 'down' ? Math.floor(q) : mode === 'up' ? Math.ceil(q) : Math.round(q);
  const decimals = Math.max(0, String(t).split('.')[1]?.length || 0);
  return Number((rounded * t).toFixed(decimals));
}

export function estimateFee(grossCost, feeRateBps) {
  const cost = Number(grossCost);
  if (feeRateBps == null || feeRateBps === '') return null;
  const bps = Number(feeRateBps);
  if (!Number.isFinite(bps)) return null;
  return Math.max(0, cost * bps / 10000);
}

export function estimateOfficialFee({ shares, price, feeRate, rawBaseFee, feeRateBps, feeFree = false, source = '' } = {}) {
  const resolved = resolveFeeRate({ rawBaseFee, feeRate, feeRateBps, feeFree, source });
  if (!resolved) return null;
  return calculatePolymarketFee({ shares, price, feeRate: resolved.normalizedFeeRate });
}

export function simulateBuyLeg(book, {
  tokenId = book?.tokenId ?? book?.asset_id ?? '',
  outcome = '',
  targetShares,
  limit,
  tickSize,
  feeRateBps,
  feeRate,
  rawBaseFee,
  feeRateSource = '',
  feeFree = false,
  selectedFeeRate = null,
  selectedFeeRateSource = '',
  selectedFeeConfidence = '',
  feeSourceDisagreements = [],
  feeSourceWarnings = [],
  endpointBaseFee = null,
  gammaFeeScheduleRate = null,
  clobFdRate = null,
  clobTakerBaseFee = null,
  isFeeFree = false,
  minOrderSize = 0,
  maxBookAgeMs = 750,
  now = Date.now(),
} = {}) {
  const rejectReasons = [];
  const age = bookAgeMs(book, now);
  if (age == null) rejectReasons.push('book_age_unknown');
  else if (age > maxBookAgeMs) rejectReasons.push('book_stale');
  if (!(Number(tickSize) > 0)) rejectReasons.push('tick_size_unknown');
  const resolvedFee = resolveFeeRate({ rawBaseFee, feeRate, feeRateBps, feeFree, source: feeRateSource });
  if (!resolvedFee) rejectReasons.push('fee_unknown');

  const bestAsk = bestPrice(book?.asks, 'ask');
  const safeLimit = limit == null ? bestAsk : Number(limit);
  if (!(safeLimit > 0)) rejectReasons.push('limit_unknown');
  const tickedLimit = Number(tickSize) > 0 && safeLimit > 0 ? roundToTick(safeLimit, tickSize, 'up') : safeLimit;
  if (tickedLimit == null || !(tickedLimit > 0)) rejectReasons.push('invalid_tick_limit');

  const shares = Number(targetShares);
  if (!(shares > 0)) rejectReasons.push('target_shares_invalid');
  if (shares > 0 && Number(minOrderSize) > 0 && shares < Number(minOrderSize)) rejectReasons.push('below_min_order_size');

  const fill = shares > 0 && tickedLimit > 0
    ? fillFromLevels(book?.asks, 'ask', shares, tickedLimit)
    : null;
  if (!fill) rejectReasons.push('no_liquidity');
  else if (!fill.full) rejectReasons.push('partial_fill');

  const feeCost = fill && resolvedFee
    ? calculatePolymarketFee({ shares: fill.filledShares, price: fill.avgPrice, feeRate: resolvedFee.normalizedFeeRate })
    : null;
  if (fill && feeCost == null) rejectReasons.push('fee_unknown');
  const totalCost = fill && feeCost != null ? fill.grossCost + feeCost : null;
  const feeAudit = fill && resolvedFee ? auditFeeLeg({
    shares: fill.filledShares,
    price: fill.avgPrice,
    rawBaseFee: resolvedFee.rawBaseFee,
    feeRate: resolvedFee.normalizedFeeRate,
    feeFree,
    source: resolvedFee.feeRateSource,
    currentFeeCost: feeCost,
  }) : null;

  return {
    tokenId,
    outcome,
    side: 'BUY',
    targetShares: shares,
    avgPrice: fill?.avgPrice ?? null,
    worstPrice: fill?.worstPrice ?? null,
    grossCost: fill?.grossCost ?? null,
    feeCost,
    totalCost,
    filledShares: fill?.filledShares ?? 0,
    fillableShares: tickedLimit > 0 ? maxFillableShares(book?.asks, 'ask', tickedLimit) : 0,
    full: !!fill?.full,
    levelsConsumed: fill?.levelsConsumed ?? [],
    bookAgeMs: age,
    tickSize: Number(tickSize) || null,
    feeRateBps: resolvedFee ? resolvedFee.normalizedFeeRate * 10000 : null,
    rawBaseFee: resolvedFee?.rawBaseFee ?? null,
    normalizedFeeRate: resolvedFee?.normalizedFeeRate ?? null,
    feeRateSource: resolvedFee?.feeRateSource || null,
    feeFree: !!feeFree,
    selectedFeeRate: selectedFeeRate ?? resolvedFee?.normalizedFeeRate ?? null,
    selectedFeeRateSource: selectedFeeRateSource || resolvedFee?.feeRateSource || null,
    selectedFeeConfidence: selectedFeeConfidence || null,
    feeSourceDisagreements,
    feeSourceWarnings,
    endpointBaseFee,
    gammaFeeScheduleRate,
    clobFdRate,
    clobTakerBaseFee,
    isFeeFree: !!isFeeFree,
    feeAudit,
    minOrderSize: Number(minOrderSize) || 0,
    fingerprint: fingerprintBook({ ...book, tokenId }),
    rejectReasons,
  };
}
