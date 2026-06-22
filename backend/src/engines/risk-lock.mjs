import { fillFromLevels, maxFillableShares } from '../lib/orderbook.mjs';
import { calculatePolymarketFee } from '../lib/fee-model.mjs';

function feeCost(shares, price, feeRate = 0) {
  return calculatePolymarketFee({ shares, price, feeRate: Number(feeRate) || 0 });
}

export function simulateSellExisting(position, book, { feeRate = 0 } = {}) {
  const shares = Number(position?.shares ?? position?.size ?? 0);
  const avgEntryPrice = Number(position?.avgEntryPrice ?? position?.avgPrice ?? position?.entryPrice ?? 0);
  const entryCost = Number(position?.entryCost ?? shares * avgEntryPrice);
  const fill = fillFromLevels(book?.bids, 'bid', shares);
  if (!fill) {
    return { method: 'sell_existing', lockStatus: 'no_lock_available', lockedPnl: null, rejectReasons: ['no_bid_liquidity'] };
  }
  const fee = feeCost(fill.filledShares, fill.avgPrice, feeRate);
  const proceeds = fill.grossCost - fee;
  const lockedPnl = proceeds - entryCost;
  return {
    method: 'sell_existing',
    lockedPnl,
    lockedPnlPct: entryCost > 0 ? lockedPnl / entryCost : null,
    minPayout: proceeds,
    totalCostAfterHedge: entryCost,
    hedgeCost: 0,
    requiredHedgeShares: 0,
    maxSafeHedgeSize: maxFillableShares(book?.bids, 'bid'),
    avgExitPrice: fill.avgPrice,
    worstPrice: fill.worstPrice,
    simulatedFill: fill,
    lockStatus: lockedPnl >= 0 ? 'locked_profit' : 'loss_reduction',
    rejectReasons: fill.full ? [] : ['partial_fill'],
  };
}

export function simulateBuyComplement(position, complementBook, { complementPriceLimit = null, feeRate = 0 } = {}) {
  const shares = Number(position?.shares ?? position?.size ?? 0);
  const avgEntryPrice = Number(position?.avgEntryPrice ?? position?.avgPrice ?? position?.entryPrice ?? 0);
  const entryCost = Number(position?.entryCost ?? shares * avgEntryPrice);
  const fill = fillFromLevels(complementBook?.asks, 'ask', shares, complementPriceLimit);
  if (!fill) {
    return { method: 'buy_complement', lockStatus: 'no_lock_available', lockedPnl: null, rejectReasons: ['no_complement_ask_liquidity'] };
  }
  const fee = feeCost(fill.filledShares, fill.avgPrice, feeRate);
  const hedgeCost = fill.grossCost + fee;
  const minPayout = Math.min(shares, fill.filledShares);
  const totalCostAfterHedge = entryCost + hedgeCost;
  const lockedPnl = minPayout - totalCostAfterHedge;
  return {
    method: 'buy_complement',
    lockedPnl,
    lockedPnlPct: totalCostAfterHedge > 0 ? lockedPnl / totalCostAfterHedge : null,
    minPayout,
    totalCostAfterHedge,
    hedgeCost,
    requiredHedgeShares: shares,
    maxSafeHedgeSize: maxFillableShares(complementBook?.asks, 'ask', complementPriceLimit),
    avgHedgePrice: fill.avgPrice,
    worstPrice: fill.worstPrice,
    simulatedFill: fill,
    lockStatus: lockedPnl >= 0 ? 'locked_profit' : (lockedPnl > -entryCost ? 'loss_reduction' : 'no_lock_available'),
    rejectReasons: fill.full ? [] : ['partial_fill'],
  };
}

export function diagnoseCompleteSetOrMerge(position = {}) {
  return {
    method: 'complete_set_or_merge',
    lockStatus: 'no_lock_available',
    lockedPnl: null,
    diagnosticOnly: true,
    rejectReasons: position.conditionId ? ['merge_not_implemented_read_only'] : ['condition_id_missing'],
  };
}

export function scanRiskLock(position, { existingBook, complementBook, feeRate = 0 } = {}) {
  const methods = [
    simulateSellExisting(position, existingBook, { feeRate }),
    simulateBuyComplement(position, complementBook, { feeRate }),
    diagnoseCompleteSetOrMerge(position),
  ];
  const ranked = methods.slice().sort((a, b) => {
    const av = Number.isFinite(Number(a.lockedPnl)) ? Number(a.lockedPnl) : -Infinity;
    const bv = Number.isFinite(Number(b.lockedPnl)) ? Number(b.lockedPnl) : -Infinity;
    return bv - av;
  });
  const best = ranked[0];
  return {
    positionId: position.id || position.asset || position.tokenId || '',
    marketId: position.marketId || '',
    tokenId: position.tokenId || position.asset || '',
    outcome: position.outcome || '',
    shares: Number(position.shares ?? position.size ?? 0),
    methods,
    bestLockMethod: best.method,
    lockStatus: best.lockStatus,
    lockedPnl: best.lockedPnl,
    lockedPnlPct: best.lockedPnlPct,
    plan: best,
    readOnly: true,
  };
}
