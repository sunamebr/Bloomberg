import { describe, it, expect } from "vitest";
import {
  RSI,
  ATR,
  RollingVolatility,
  peakGapRatio,
  zScore,
  bollingerBands,
} from "../src/strategies/indicators";

describe("RSI", () => {
  it("returns null on first update", () => {
    const rsi = new RSI(14);
    expect(rsi.update(100)).toBeNull();
  });

  it("returns a value within (0,100) after period", () => {
    const rsi = new RSI(3);
    rsi.update(10);
    rsi.update(12);
    rsi.update(11);
    const result = rsi.update(13);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
    expect(result!).toBeLessThan(100);
  });

  it("returns 100 on monotonically rising series", () => {
    const rsi = new RSI(3);
    rsi.update(10);
    rsi.update(11);
    rsi.update(12);
    const result = rsi.update(13);
    expect(result).toBe(100);
  });
});

describe("ATR", () => {
  it("returns null until enough samples", () => {
    const atr = new ATR(3);
    expect(atr.update(100)).not.toBeNull();
    expect(atr.update(102)).not.toBeNull();
  });
});

describe("RollingVolatility", () => {
  it("returns null for fewer than 2 samples", () => {
    const v = new RollingVolatility(5);
    expect(v.update(100)).toBeNull();
    expect(v.update(101)).not.toBeNull();
  });
});

describe("helpers", () => {
  it("peakGapRatio handles zero peak", () => {
    expect(peakGapRatio(1, 0)).toBe(0);
    expect(peakGapRatio(2, 4)).toBe(0.5);
  });

  it("zScore returns 0 when stdDev=0", () => {
    expect(zScore(5, 5, 0)).toBe(0);
    expect(zScore(7, 5, 2)).toBe(1);
  });

  it("bollingerBands returns null when below period", () => {
    expect(bollingerBands([1, 2], 5)).toBeNull();
    const bb = bollingerBands([1, 2, 3, 4, 5], 5);
    expect(bb).not.toBeNull();
    expect(bb!.middle).toBe(3);
    expect(bb!.upper).toBeGreaterThan(bb!.middle);
    expect(bb!.lower).toBeLessThan(bb!.middle);
  });
});
