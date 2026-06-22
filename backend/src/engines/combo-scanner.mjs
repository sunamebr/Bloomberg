import { simulateBuyLeg } from '../lib/execution-sim.mjs';

export function validateComboRelation({ sameEventId = false, sameConditionGroup = false, explicitRelationMetadata = false, exhaustive = false, mutuallyExclusive = false, complementaryOutcomes = false, parserConfidence = 'low' } = {}) {
  const whyValid = [];
  if (sameEventId) whyValid.push('sameEventId');
  if (sameConditionGroup) whyValid.push('sameConditionGroup');
  if (explicitRelationMetadata) whyValid.push('explicit_relation_metadata');
  if (exhaustive) whyValid.push('exhaustive_outcome_list');
  if (complementaryOutcomes) whyValid.push('complementary_outcomes');
  if (parserConfidence === 'high') whyValid.push('relation_parser_high_confidence');
  const proven = sameEventId || sameConditionGroup || explicitRelationMetadata || (exhaustive && mutuallyExclusive) || complementaryOutcomes || parserConfidence === 'high';
  return {
    proven,
    confidence: proven && exhaustive && mutuallyExclusive ? 'high' : (proven ? 'medium' : 'low'),
    whyValid,
    whyRejected: proven ? [] : ['relation_not_proven'],
  };
}

function comboStatus({ relation, guaranteedPnl, confidence }) {
  if (!relation.proven) return 'diagnostic_only';
  if (confidence === 'high' && guaranteedPnl > 0) return 'executable_math_lock';
  if (guaranteedPnl > 0 && confidence === 'medium') return 'medium_confidence_combo';
  if (confidence === 'high') return 'high_confidence_combo';
  return 'diagnostic_only';
}

export function scanCompleteSetCombo({
  comboId = '',
  markets = [],
  targetShares = 5,
  exhaustive = false,
  mutuallyExclusive = false,
  confidence = 'low',
  logicalRelation = '',
  relationMetadata = {},
} = {}) {
  const rejectReasons = [];
  const relation = validateComboRelation({ exhaustive, mutuallyExclusive, ...relationMetadata, parserConfidence: confidence });
  if (!exhaustive) rejectReasons.push('outcomes_not_exhaustive');
  if (!mutuallyExclusive) rejectReasons.push('outcomes_not_mutually_exclusive');
  if (!logicalRelation) rejectReasons.push('logical_relation_missing');
  for (const reason of relation.whyRejected) rejectReasons.push(reason);
  const legs = markets.map((m) => simulateBuyLeg(m.book, {
    tokenId: m.tokenId,
    outcome: m.outcome,
    targetShares,
    tickSize: m.tickSize,
    feeRate: m.feeRate,
    feeRateSource: m.feeRateSource,
    feeFree: m.feeFree,
    minOrderSize: m.minOrderSize,
  }));
  for (const leg of legs) for (const reason of leg.rejectReasons || []) rejectReasons.push(`${leg.outcome || leg.tokenId}:${reason}`);
  const totalCost = legs.every((x) => x.totalCost != null) ? legs.reduce((sum, x) => sum + x.totalCost, 0) : null;
  const minPayout = Number(targetShares) || 0;
  const guaranteedPnl = totalCost == null ? null : minPayout - totalCost;
  const netEdgePct = guaranteedPnl == null || minPayout <= 0 ? null : guaranteedPnl / minPayout;
  const maxSafeSize = legs.length ? Math.min(...legs.map((x) => x.fillableShares || 0)) : 0;
  if (!(guaranteedPnl > 0)) rejectReasons.push('guaranteed_pnl_negative');
  const relationIncomplete = rejectReasons.includes('logical_relation_missing') || rejectReasons.includes('outcomes_not_exhaustive') || rejectReasons.includes('outcomes_not_mutually_exclusive') || rejectReasons.includes('relation_not_proven');
  const status = relationIncomplete ? 'diagnostic_only' : comboStatus({ relation, guaranteedPnl, confidence: relation.confidence });
  return {
    comboId: comboId || `combo-${markets.map((x) => x.marketId || x.tokenId).join('-')}`,
    type: 'complete_set_multi_outcome',
    markets: markets.map((x) => x.marketId || ''),
    legs,
    relationType: logicalRelation || 'complete_set',
    logicalRelation,
    confidence: relation.confidence,
    minPayout,
    totalCost,
    guaranteedPnl,
    netEdgePct,
    maxSafeSize,
    status,
    whyValid: relation.whyValid,
    whyRejected: [...new Set(rejectReasons)],
    reasonIfRejected: [...new Set(rejectReasons)],
    readOnly: true,
  };
}

export function scanRelatedMarketCombo({ comboId = '', markets = [], logicalRelation = '', confidence = 'low', relationMetadata = {} } = {}) {
  const relation = validateComboRelation({ ...relationMetadata, parserConfidence: confidence });
  return {
    comboId: comboId || `related-${markets.map((x) => x.marketId || x.tokenId || 'm').join('-')}`,
    type: 'related_market_combinatorial',
    markets: markets.map((x) => x.marketId || ''),
    legs: [],
    relationType: logicalRelation || 'unknown_related_market',
    logicalRelation,
    confidence: relation.confidence,
    minPayout: null,
    totalCost: null,
    guaranteedPnl: null,
    netEdgePct: null,
    maxSafeSize: null,
    status: relation.proven ? 'diagnostic_only' : 'invalid_relation',
    whyValid: relation.whyValid,
    whyRejected: relation.proven ? ['formal_exclusivity_not_proven'] : ['logical_relation_missing', 'relation_not_proven'],
    reasonIfRejected: relation.proven ? ['formal_exclusivity_not_proven'] : ['logical_relation_missing', 'relation_not_proven'],
    readOnly: true,
  };
}
