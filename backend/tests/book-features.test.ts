import { describe, it, expect } from "vitest";
import { bookFeatures } from "../src/strategies/book-features";

describe("bookFeatures", () => {
  it("computes spreads, imbalance and microprice", () => {
    const f = bookFeatures({
      yesBid: 0.48,
      yesAsk: 0.52,
      noBid: 0.48,
      noAsk: 0.52,
      yesBidDepth: 100,
      yesAskDepth: 100,
      noBidDepth: 50,
      noAskDepth: 150,
    });
    expect(f.yesSpread).toBeCloseTo(0.04);
    expect(f.noSpread).toBeCloseTo(0.04);
    expect(f.rawAskSum).toBeCloseTo(1.04);
    expect(f.yesImbalance).toBe(0);
    expect(f.noImbalance).toBeCloseTo((50 - 150) / 200);
    expect(f.maxSafeSize).toBe(100);
    expect(f.yesMicroprice).not.toBeNull();
  });

  it("handles null quotes", () => {
    const f = bookFeatures({
      yesBid: null,
      yesAsk: null,
      noBid: null,
      noAsk: null,
      yesBidDepth: 0,
      yesAskDepth: 0,
      noBidDepth: 0,
      noAskDepth: 0,
    });
    expect(f.yesSpread).toBeNull();
    expect(f.noSpread).toBeNull();
    expect(f.yesImbalance).toBe(0);
    expect(f.maxSafeSize).toBe(0);
  });
});
