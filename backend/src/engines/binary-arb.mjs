import { simulateBuyLeg } from '../lib/execution-sim.mjs';

export function makeOpportunityId(type, marketId, fingerprints) {
  const raw = `${type}:${marketId}:${fingerprints.join(':')}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return `${type}-${Math.abs(hash).toString(36)}`;
}

export function evaluateBinaryArb({
  marketId,
  conditionId = '',
  yes,
  no,
  targetShares,
  minEdgeAbs = 0.01,
  bufferAbs = 0,
  maxBookAgeMs = 750,
  now = Date.now(),
} = {}) {
  const rejectReasons = [];
  if (!marketId) rejectReasons.push('market_id_missing');
  if (!yes?.book || !no?.book) rejectReasons.push('missing_leg_book');

  const minSize = Math.max(Number(yes?.minOrderSize) || 0, Number(no?.minOrderSize) || 0);
  const requestedShares = Number(targetShares);
  if (!(requestedShares > 0)) rejectReasons.push('target_shares_invalid');
  if (requestedShares > 0 && requestedShares < minSize) rejectReasons.push('below_min_order_size');

  const yesLeg = yes?.book ? simulateBuyLeg(yes.book, {
    tokenId: yes.tokenId,
    outcome: yes.outcome || 'YES',
    targetShares: requestedShares,
    limit: yes.limit,
    tickSize: yes.tickSize,
    feeRateBps: yes.feeRateBps,
    feeRate: yes.feeRate,
    rawBaseFee: yes.rawBaseFee,
    feeRateSource: yes.feeRateSource,
    feeFree: yes.feeFree,
    selectedFeeRate: yes.selectedFeeRate,
    selectedFeeRateSource: yes.selectedFeeRateSource,
    selectedFeeConfidence: yes.selectedFeeConfidence,
    feeSourceDisagreements: yes.feeSourceDisagreements,
    feeSourceWarnings: yes.feeSourceWarnings,
    endpointBaseFee: yes.endpointBaseFee,
    gammaFeeScheduleRate: yes.gammaFeeScheduleRate,
    clobFdRate: yes.clobFdRate,
    clobTakerBaseFee: yes.clobTakerBaseFee,
    isFeeFree: yes.isFeeFree,
    minOrderSize: yes.minOrderSize,
    maxBookAgeMs,
    now,
  }) : null;

  const noLeg = no?.book ? simulateBuyLeg(no.book, {
    tokenId: no.tokenId,
    outcome: no.outcome || 'NO',
    targetShares: requestedShares,
    limit: no.limit,
    tickSize: no.tickSize,
    feeRateBps: no.feeRateBps,
    feeRate: no.feeRate,
    rawBaseFee: no.rawBaseFee,
    feeRateSource: no.feeRateSource,
    feeFree: no.feeFree,
    selectedFeeRate: no.selectedFeeRate,
    selectedFeeRateSource: no.selectedFeeRateSource,
    selectedFeeConfidence: no.selectedFeeConfidence,
    feeSourceDisagreements: no.feeSourceDisagreements,
    feeSourceWarnings: no.feeSourceWarnings,
    endpointBaseFee: no.endpointBaseFee,
    gammaFeeScheduleRate: no.gammaFeeScheduleRate,
    clobFdRate: no.clobFdRate,
    clobTakerBaseFee: no.clobTakerBaseFee,
    isFeeFree: no.isFeeFree,
    minOrderSize: no.minOrderSize,
    maxBookAgeMs,
    now,
  }) : null;

  const legs = [yesLeg, noLeg].filter(Boolean);
  for (const leg of legs) {
    for (const reason of leg.rejectReasons) rejectReasons.push(`${leg.outcome}:${reason}`);
  }

  const maxSafeSize = legs.length === 2 ? Math.min(...legs.map((x) => x.fillableShares || 0)) : 0;
  if (requestedShares > maxSafeSize + 1e-9) rejectReasons.push('target_above_liquidity');

  const totalCost = legs.length === 2 && legs.every((x) => x.totalCost != null)
    ? legs.reduce((sum, x) => sum + x.totalCost, 0) + Number(bufferAbs || 0)
    : null;
  const payoutMin = requestedShares > 0 ? requestedShares : null;
  const guaranteedPnl = totalCost != null && payoutMin != null ? payoutMin - totalCost : null;
  const netEdgePct = guaranteedPnl != null && payoutMin > 0 ? guaranteedPnl / payoutMin : null;
  if (guaranteedPnl != null && guaranteedPnl <= Number(minEdgeAbs)) rejectReasons.push('edge_below_threshold');

  const fingerprints = legs.map((x) => x.fingerprint);
  const status = rejectReasons.length ? 'rejected' : 'detected';
  return {
    id: makeOpportunityId('binary_arb', marketId || 'unknown', fingerprints),
    type: 'binary_arb',
    marketId: marketId || '',
    conditionId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + maxBookAgeMs).toISOString(),
    bookAgeMs: legs.length ? Math.max(...legs.map((x) => x.bookAgeMs ?? Infinity)) : null,
    legs,
    payoutMin,
    totalCost,
    guaranteedPnl,
    netEdgePct,
    maxSafeSize,
    rejectReasons: [...new Set(rejectReasons)],
    status,
  };
}
