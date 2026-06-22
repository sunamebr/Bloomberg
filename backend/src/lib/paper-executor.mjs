import { randomUUID } from 'node:crypto';
import { fillFromLevels } from './orderbook.mjs';
import { calculatePolymarketFee } from './fee-model.mjs';
import { simulateBuyLeg } from './execution-sim.mjs';
import { appendJsonl } from './jsonl-log.mjs';

function simulateSellLeg(book, leg = {}) {
  const shares = Number(leg.targetShares || leg.shares || 0);
  const fill = fillFromLevels(book?.bids, 'bid', shares, leg.limit);
  const feeRate = Number(leg.feeRate) || 0;
  const feeCost = fill ? calculatePolymarketFee({ shares: fill.filledShares, price: fill.avgPrice, feeRate }) : null;
  return {
    tokenId: leg.tokenId || book?.tokenId || book?.asset_id || '',
    side: 'SELL',
    targetShares: shares,
    avgPrice: fill?.avgPrice ?? null,
    worstPrice: fill?.worstPrice ?? null,
    proceeds: fill && feeCost != null ? fill.grossCost - feeCost : null,
    feeCost,
    filledShares: fill?.filledShares ?? 0,
    full: !!fill?.full,
    simulatedFill: fill,
    rejectReasons: fill ? (fill.full ? [] : ['partial_fill']) : ['no_bid_liquidity'],
  };
}

export function simulatePaperTrade({ strategyType = 'binary_arb', legs = [], checkpoints = {} } = {}) {
  const simulatedLegs = legs.map((leg) => {
    if (String(leg.side || 'BUY').toUpperCase() === 'SELL') return simulateSellLeg(leg.book, leg);
    return simulateBuyLeg(leg.book, {
      tokenId: leg.tokenId,
      outcome: leg.outcome,
      targetShares: leg.targetShares || leg.shares,
      limit: leg.limit,
      tickSize: leg.tickSize,
      feeRate: leg.feeRate,
      feeRateSource: leg.feeRateSource,
      feeFree: leg.feeFree,
      minOrderSize: leg.minOrderSize,
    });
  });
  const buyCost = simulatedLegs.filter((x) => x.side === 'BUY').reduce((sum, x) => sum + (Number(x.totalCost) || 0), 0);
  const sellProceeds = simulatedLegs.filter((x) => x.side === 'SELL').reduce((sum, x) => sum + (Number(x.proceeds) || 0), 0);
  const filledShares = simulatedLegs.map((x) => Number(x.filledShares) || 0);
  const minFilled = filledShares.length ? Math.min(...filledShares) : 0;
  const guaranteedPnl = strategyType === 'binary_arb' ? minFilled - buyCost + sellProceeds : sellProceeds - buyCost;
  const residualRisk = simulatedLegs.some((x) => !x.full) ? 'partial_fill_residual' : 'none';
  const paper = {
    paperTradeId: `paper-${randomUUID()}`,
    strategyType,
    legs: simulatedLegs,
    simulatedFill: simulatedLegs.every((x) => x.full) ? 'full' : 'partial',
    avgPrice: simulatedLegs.length ? simulatedLegs.reduce((sum, x) => sum + (Number(x.avgPrice) || 0), 0) / simulatedLegs.length : null,
    worstPrice: simulatedLegs.map((x) => x.worstPrice).filter((x) => x != null).at(-1) ?? null,
    totalCost: buyCost,
    guaranteedPnl,
    residualRisk,
    resultAfter250ms: checkpoints.after250ms ?? null,
    resultAfter500ms: checkpoints.after500ms ?? null,
    resultAfter1000ms: checkpoints.after1000ms ?? null,
    resultAfter5000ms: checkpoints.after5000ms ?? null,
    readOnly: true,
  };
  appendJsonl('paper-simulations.jsonl', paper);
  return paper;
}

export function demoPaperArb() {
  const now = Date.now();
  return simulatePaperTrade({
    strategyType: 'binary_arb',
    legs: [
      { side: 'BUY', tokenId: 'paper-yes', outcome: 'YES', targetShares: 5, tickSize: 0.001, feeRate: 0, book: { tokenId: 'paper-yes', receivedAt: now, asks: [{ price: 0.49, size: 10 }], bids: [] } },
      { side: 'BUY', tokenId: 'paper-no', outcome: 'NO', targetShares: 5, tickSize: 0.001, feeRate: 0, book: { tokenId: 'paper-no', receivedAt: now, asks: [{ price: 0.50, size: 10 }], bids: [] } },
    ],
    checkpoints: { after250ms: { pnl: 0.05 }, after500ms: { pnl: 0.05 }, after1000ms: { pnl: 0.05 }, after5000ms: { pnl: 0.05 } },
  });
}
