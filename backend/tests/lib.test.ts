import { describe, it, expect } from "vitest";
import {
  normalizeLevels,
  sortedLevels,
  fillFromLevels,
  fingerprintBook,
  bookAgeMs,
} from "../src/lib/orderbook.mjs";
import {
  calculatePolymarketFee,
  normalizeFeeRate,
  resolveFeeRate,
  isFeeFreeMarket,
} from "../src/lib/fee-model.mjs";

describe("orderbook.normalizeLevels", () => {
  it("accepts array of {price,size} and object form", () => {
    expect(normalizeLevels([{ price: 0.5, size: 10 }])).toEqual([{ price: 0.5, size: 10 }]);
    expect(normalizeLevels({ "0.5": 10 })).toEqual([{ price: 0.5, size: 10 }]);
    expect(normalizeLevels([{ price: 0, size: 10 }])).toEqual([]);
  });
});

describe("orderbook.fillFromLevels", () => {
  it("computes average fill and consumed levels", () => {
    const fill = fillFromLevels(
      [
        { price: "0.49", size: "2" },
        { price: "0.50", size: "3" },
      ],
      "ask",
      5,
      0.5,
    );
    expect(fill.full).toBe(true);
    expect(fill.filledShares).toBe(5);
    expect(fill.grossCost).toBeCloseTo(2.48);
    expect(fill.worstPrice).toBe(0.5);
  });

  it("returns partial when depth insufficient", () => {
    const fill = fillFromLevels([{ price: 0.49, size: 2 }], "ask", 5, 0.5);
    expect(fill.full).toBe(false);
    expect(fill.filledShares).toBe(2);
  });
});

describe("orderbook.fingerprintBook + bookAgeMs", () => {
  it("fingerprint changes when top-of-book changes", () => {
    const a = fingerprintBook({ tokenId: "1", bids: [{ price: 0.48, size: 1 }], asks: [{ price: 0.5, size: 1 }], timestamp: 1 });
    const b = fingerprintBook({ tokenId: "1", bids: [{ price: 0.48, size: 1 }], asks: [{ price: 0.51, size: 1 }], timestamp: 1 });
    expect(a).not.toBe(b);
  });

  it("bookAgeMs handles seconds vs milliseconds", () => {
    expect(bookAgeMs({ timestamp: Date.now() / 1000 })).toBeLessThan(2000);
    expect(bookAgeMs({ receivedAt: Date.now() })).toBeLessThan(100);
    expect(bookAgeMs({})).toBeNull();
  });
});

describe("fee-model", () => {
  it("calculatePolymarketFee matches sanity case", () => {
    expect(calculatePolymarketFee({ feeRate: 0.03, price: 0.5, shares: 100 })).toBeCloseTo(0.75);
  });

  it("normalizeFeeRate converts bps-like values", () => {
    expect(normalizeFeeRate(0.03)).toBe(0.03);
    expect(normalizeFeeRate(300)).toBe(0.03);
    expect(normalizeFeeRate(null)).toBeNull();
  });

  it("resolveFeeRate prefers explicit feeRate", () => {
    const r = resolveFeeRate({ feeRate: 0.05 });
    expect(r?.normalizedFeeRate).toBe(0.05);
    expect(r?.feeRateSource).toBe("decimal_fee_rate");
  });

  it("resolveFeeRate handles feeFree", () => {
    const r = resolveFeeRate({ feeFree: true, rawBaseFee: 200 });
    expect(r?.normalizedFeeRate).toBe(0);
    expect(r?.feeRateSource).toBe("fee_free_market");
  });

  it("isFeeFreeMarket detects geopolitics", () => {
    expect(isFeeFreeMarket({ category: "Geopolitics" })).toBe(true);
    expect(isFeeFreeMarket({ feesEnabled: false })).toBe(true);
    expect(isFeeFreeMarket({ category: "Crypto" })).toBe(false);
  });
});
