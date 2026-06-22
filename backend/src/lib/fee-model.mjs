export function normalizeFeeRate(rawBaseFee) {
  if (rawBaseFee == null || rawBaseFee === '') return null;
  const raw = Number(rawBaseFee);
  if (!Number.isFinite(raw) || raw < 0) return null;
  if (raw <= 1) return raw;
  return raw / 10000;
}

export function feeRateInterpretations(rawBaseFee, { price = 0.5, shares = 100 } = {}) {
  const raw = Number(rawBaseFee);
  if (!Number.isFinite(raw) || raw < 0) return [];
  return [
    { label: 'base_fee / 10000', feeRate: raw / 10000 },
    { label: 'base_fee / 1000', feeRate: raw / 1000 },
    { label: 'base_fee / 100', feeRate: raw / 100 },
    { label: 'base_fee direct', feeRate: raw },
  ].map((row) => ({
    ...row,
    fee: calculatePolymarketFee({ shares, price, feeRate: row.feeRate }),
    feePerShare: calculateFeePerShare({ price, feeRate: row.feeRate }),
    feeBpsOfPayout: calculateFeeBpsOfPayout({ price, feeRate: row.feeRate }),
  }));
}

export function calculatePolymarketFee({ shares, price, feeRate }) {
  const q = Number(shares);
  const p = Number(price);
  const r = Number(feeRate);
  if (!(q >= 0) || !(p >= 0) || !(p <= 1) || !(r >= 0)) return null;
  return q * r * p * (1 - p);
}

export function calculateFeePerShare({ price, feeRate }) {
  return calculatePolymarketFee({ shares: 1, price, feeRate });
}

export function calculateFeeBpsOfPayout({ price, feeRate }) {
  const perShare = calculateFeePerShare({ price, feeRate });
  return perShare == null ? null : perShare * 10000;
}

export function calculateTwoLegFeeBps({ yesPrice, noPrice, yesFeeRate, noFeeRate }) {
  const yes = calculateFeeBpsOfPayout({ price: yesPrice, feeRate: yesFeeRate });
  const no = calculateFeeBpsOfPayout({ price: noPrice, feeRate: noFeeRate });
  if (yes == null || no == null) return null;
  return yes + no;
}

export function isFeeFreeMarket(market = {}) {
  if (market.feesEnabled === false || String(market.feesEnabled).toLowerCase() === 'false') return true;
  const text = [
    market.category,
    market.tags,
    market.question,
    market.title,
    market.slug,
  ].flatMap((x) => Array.isArray(x) ? x : [x]).filter(Boolean).join(' ').toLowerCase();
  return /\b(geopolitics|world events|world-events)\b/.test(text);
}

export function resolveFeeRate({
  rawBaseFee,
  feeRate,
  feeRateBps,
  feeFree = false,
  source = '',
} = {}) {
  if (feeFree) {
    return {
      rawBaseFee: rawBaseFee ?? feeRate ?? feeRateBps ?? 0,
      normalizedFeeRate: 0,
      feeRateSource: source || 'fee_free_market',
    };
  }
  if (feeRate != null && feeRate !== '') {
    const normalized = normalizeFeeRate(feeRate);
    return normalized == null ? null : {
      rawBaseFee: feeRate,
      normalizedFeeRate: normalized,
      feeRateSource: source || 'decimal_fee_rate',
    };
  }
  if (rawBaseFee != null && rawBaseFee !== '') {
    const normalized = normalizeFeeRate(rawBaseFee);
    return normalized == null ? null : {
      rawBaseFee,
      normalizedFeeRate: normalized,
      feeRateSource: source || (Number(rawBaseFee) <= 1 ? 'decimal_fee_rate' : 'endpoint_fee_rate'),
    };
  }
  if (feeRateBps != null && feeRateBps !== '') {
    const normalized = normalizeFeeRate(feeRateBps);
    return normalized == null ? null : {
      rawBaseFee: feeRateBps,
      normalizedFeeRate: normalized,
      feeRateSource: source || 'legacy_fee_rate_bps',
    };
  }
  return null;
}

export function auditFeeLeg({
  shares,
  price,
  rawBaseFee,
  feeRate,
  feeRateBps,
  feeFree = false,
  source = '',
  currentFeeCost = null,
} = {}) {
  const resolved = resolveFeeRate({ rawBaseFee, feeRate, feeRateBps, feeFree, source });
  if (!resolved) return null;
  const officialFee = calculatePolymarketFee({ shares, price, feeRate: resolved.normalizedFeeRate });
  const officialFeePerShare = calculateFeePerShare({ price, feeRate: resolved.normalizedFeeRate });
  const officialFeeBps = calculateFeeBpsOfPayout({ price, feeRate: resolved.normalizedFeeRate });
  const delta = currentFeeCost == null || officialFee == null ? 0 : Number(currentFeeCost) - officialFee;
  const q = Number(shares);
  const feeDeltaBps = q > 0 ? (delta / q) * 10000 : null;
  return {
    ...resolved,
    officialFee,
    officialFeePerShare,
    officialFeeBps,
    feeFromCurrentCode: currentFeeCost == null ? officialFee : Number(currentFeeCost),
    feeFromOfficialFormula: officialFee,
    feeDelta: delta,
    feeDeltaBps,
    feeModelMismatch: feeDeltaBps != null && Math.abs(feeDeltaBps) > 1,
  };
}
