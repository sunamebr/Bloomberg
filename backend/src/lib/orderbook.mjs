export function normalizeLevels(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([price, size]) => ({ price, size }));
  return arr
    .map((x) => {
      if (Array.isArray(x)) return { price: Number(x[0]), size: Number(x[1]) };
      return {
        price: Number(x.price ?? x.p ?? x.px),
        size: Number(x.size ?? x.s ?? x.shares ?? x.quantity),
      };
    })
    .filter((x) => Number.isFinite(x.price) && Number.isFinite(x.size) && x.price > 0 && x.size > 0);
}

export function sortedLevels(raw, side) {
  const levels = normalizeLevels(raw);
  return levels.sort((a, b) => side === 'ask' ? a.price - b.price : b.price - a.price);
}

export function bestPrice(raw, side) {
  const levels = sortedLevels(raw, side);
  return levels[0]?.price ?? null;
}

export function fillFromLevels(raw, side, shares, limit = null) {
  const target = Number(shares);
  if (!(target > 0)) return null;
  const levels = sortedLevels(raw, side).filter((x) => {
    if (!(limit > 0)) return true;
    return side === 'ask' ? x.price <= limit : x.price >= limit;
  });
  let remaining = target;
  let filled = 0;
  let grossCost = 0;
  let worstPrice = null;
  const consumed = [];

  for (const level of levels) {
    const take = Math.min(remaining, level.size);
    if (!(take > 0)) continue;
    filled += take;
    grossCost += take * level.price;
    remaining -= take;
    worstPrice = level.price;
    consumed.push({ price: level.price, size: take });
    if (remaining <= 1e-9) break;
  }

  if (!(filled > 0)) return null;
  return {
    avgPrice: grossCost / filled,
    grossCost,
    filledShares: filled,
    full: remaining <= 1e-9,
    worstPrice,
    levelsConsumed: consumed,
  };
}

export function maxFillableShares(raw, side, limit = null) {
  return sortedLevels(raw, side)
    .filter((x) => !(limit > 0) || (side === 'ask' ? x.price <= limit : x.price >= limit))
    .reduce((sum, x) => sum + x.size, 0);
}

export function fingerprintBook(book, depth = 3) {
  const bids = sortedLevels(book?.bids, 'bid').slice(0, depth)
    .map((x) => `${x.price}:${x.size}`).join('|');
  const asks = sortedLevels(book?.asks, 'ask').slice(0, depth)
    .map((x) => `${x.price}:${x.size}`).join('|');
  return `${book?.tokenId ?? book?.asset_id ?? ''}#${bids}#${asks}#${book?.timestamp ?? book?.updatedAt ?? ''}`;
}

export function bookAgeMs(book, now = Date.now()) {
  const raw = book?.receivedAt ?? book?.fetchedAt ?? book?.timestamp ?? book?.ts ?? null;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  const t = Number.isFinite(n) ? (n > 1e12 ? n : n * 1000) : Date.parse(String(raw));
  return Number.isFinite(t) ? Math.max(0, now - t) : null;
}
