import { describe, it, expect } from "vitest";
import { Slot } from "../src/core/slot";
import { Env } from "../src/core/config";
import { ASSET_CONFIG } from "../src/core/config";

describe("Slot", () => {
  it("aligns slot start to window boundary", () => {
    const slot = new Slot("BTC", 300);
    const start = slot.currentSlotStart(1001);
    expect(start).toBe(900);
    expect(slot.nextSlotStart(1001)).toBe(1200);
    expect(slot.remaining(1001)).toBe(199);
  });

  it("slug encodes asset + window label + ts", () => {
    const slot = new Slot("BTC", 300);
    expect(slot.slugFor(1000)).toBe("BTC-updown-5m-1000");
  });
});

describe("Env", () => {
  it("applies defaults", () => {
    const env = new Env({});
    expect(env.marketAsset).toBe("BTC");
    expect(env.marketWindow).toBe("5m");
    expect(env.windowSeconds).toBe(300);
    expect(env.isProd).toBe(false);
  });

  it("rejects invalid asset", () => {
    expect(() => new Env({ MARKET_ASSET: "FOO" })).toThrow();
  });

  it("exposes all configured assets", () => {
    expect(Object.keys(ASSET_CONFIG)).toContain("BTC");
    expect(Object.keys(ASSET_CONFIG)).toContain("DOGE");
    expect(ASSET_CONFIG.ETH.binance).toBe("ETHUSDT");
  });
});
