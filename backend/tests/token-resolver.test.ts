import { describe, expect, it } from "vitest";
import { resolveBinaryTokenId } from "../src/strategies/token-resolver";
import type { SlotInfo } from "../src/strategies/types";

const baseSlot: SlotInfo = {
  asset: "BTC",
  windowSeconds: 300,
  startTs: 0,
  endTs: 300,
  slug: "btc-updown-5m",
  remaining: 120,
};

describe("resolveBinaryTokenId", () => {
  it("returns market-discovered token ids", () => {
    const slot = { ...baseSlot, upTokenId: "up-token", downTokenId: "down-token" };

    expect(resolveBinaryTokenId(slot, "UP")).toBe("up-token");
    expect(resolveBinaryTokenId(slot, "DOWN")).toBe("down-token");
  });

  it("does not synthesize Polymarket token ids from asset symbols", () => {
    expect(resolveBinaryTokenId(baseSlot, "UP")).toBeNull();
    expect(resolveBinaryTokenId(baseSlot, "DOWN")).toBeNull();
  });
});
