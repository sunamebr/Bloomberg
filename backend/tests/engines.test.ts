import { describe, it, expect } from "vitest";
import {
  evaluateBinaryArb,
  makeOpportunityId,
} from "../src/engines/binary-arb.mjs";
import { validateComboRelation, scanCompleteSetCombo } from "../src/engines/combo-scanner.mjs";
import { scanRiskLock, simulateSellExisting } from "../src/engines/risk-lock.mjs";

const now = 1_700_000_000_000;

describe("binary-arb", () => {
  it("detects a profitable two-leg arb", () => {
    const result = evaluateBinaryArb({
      marketId: "m1",
      targetShares: 5,
      now,
      yes: {
        tokenId: "yes-tok",
        book: { tokenId: "yes-tok", receivedAt: now, asks: [{ price: 0.49, size: 10 }], bids: [] },
        tickSize: 0.001,
        feeRate: 0,
        minOrderSize: 0,
      },
      no: {
        tokenId: "no-tok",
        book: { tokenId: "no-tok", receivedAt: now, asks: [{ price: 0.5, size: 10 }], bids: [] },
        tickSize: 0.001,
        feeRate: 0,
        minOrderSize: 0,
      },
    });
    expect(result.status).toBe("detected");
    expect(result.guaranteedPnl).toBeGreaterThan(0);
    expect(result.rejectReasons).toEqual([]);
  });

  it("rejects when edge below threshold", () => {
    const result = evaluateBinaryArb({
      marketId: "m1",
      targetShares: 5,
      minEdgeAbs: 100,
      now,
      yes: {
        book: { tokenId: "y", receivedAt: now, asks: [{ price: 0.49, size: 10 }] },
        tickSize: 0.001, feeRate: 0,
      },
      no: {
        book: { tokenId: "n", receivedAt: now, asks: [{ price: 0.5, size: 10 }] },
        tickSize: 0.001, feeRate: 0,
      },
    });
    expect(result.status).toBe("rejected");
    expect(result.rejectReasons).toContain("edge_below_threshold");
  });

  it("makeOpportunityId is deterministic", () => {
    const id = makeOpportunityId("binary_arb", "m1", ["fp1"]);
    expect(id).toBe(makeOpportunityId("binary_arb", "m1", ["fp1"]));
  });
});

describe("combo-scanner", () => {
  it("validateComboRelation proven only with strong evidence", () => {
    expect(validateComboRelation({}).proven).toBe(false);
    expect(validateComboRelation({ sameEventId: true }).proven).toBe(true);
    expect(validateComboRelation({ exhaustive: true, mutuallyExclusive: true }).proven).toBe(true);
  });

  it("scanCompleteSetCombo is diagnostic when relation unproven", () => {
    const r = scanCompleteSetCombo({ markets: [], exhaustive: false, mutuallyExclusive: false });
    expect(r.status).toBe("diagnostic_only");
    expect(r.readOnly).toBe(true);
  });
});

describe("risk-lock", () => {
  it("simulateSellExisting reports no_lock when no bids", () => {
    const r = simulateSellExisting(
      { shares: 5, avgEntryPrice: 0.4 },
      { tokenId: "t", bids: [], asks: [] },
      { feeRate: 0 },
    );
    expect(r.lockStatus).toBe("no_lock_available");
    expect(r.rejectReasons).toContain("no_bid_liquidity");
  });

  it("scanRiskLock returns ranked methods with a best", () => {
    const r = scanRiskLock(
      { shares: 5, avgEntryPrice: 0.4, tokenId: "t" },
      {
        existingBook: { tokenId: "t", bids: [{ price: 0.5, size: 10 }], asks: [] },
        complementBook: { tokenId: "t2", asks: [{ price: 0.4, size: 10 }], bids: [] },
        feeRate: 0,
      },
    );
    expect(r.methods.length).toBe(3);
    expect(r.bestLockMethod).toBeTruthy();
  });
});
