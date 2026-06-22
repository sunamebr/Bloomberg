import { describe, it, expect } from "vitest";
import { costGate } from "../src/risk/cost-gate";
import { CircuitBreaker } from "../src/risk/circuit-breaker";
import { RiskLimits } from "../src/risk/limits";

describe("costGate", () => {
  it("rejects when expected move below round-trip cost", () => {
    const r = costGate({ expectedMoveBps: 10, spreadBps: 5 });
    expect(r.ok).toBe(false);
    expect(r.rejectReason).toBe("expected_edge_below_roundtrip_cost");
  });

  it("accepts when edge clears cost", () => {
    const r = costGate({ expectedMoveBps: 50, spreadBps: 5, feeBps: 5, slippageBps: 5, latencyRiskBps: 5 });
    expect(r.ok).toBe(true);
    expect(r.edgeAfterCostBps).toBeGreaterThan(0);
  });
});

describe("CircuitBreaker", () => {
  it("trips on divergence and reports reason", () => {
    const cb = new CircuitBreaker({ divergenceThreshold: 5, stalenessMs: 1000 });
    expect(cb.isTripped).toBe(false);
    cb.checkDivergence(100, 110);
    expect(cb.isTripped).toBe(true);
    expect(cb.tripReason).toBe("exchange_divergence");
    cb.reset();
    expect(cb.isTripped).toBe(false);
  });
});

describe("RiskLimits", () => {
  it("halts when session loss exceeds max", () => {
    const rl = new RiskLimits({ maxSessionLoss: 25, maxDailyLossPerBot: 5 });
    expect(rl.canTrade("bot1")).toBe(true);
    rl.recordBotPnl("bot1", -10);
    expect(rl.canTrade("bot1")).toBe(false);
    expect(rl.sessionHalted).toBe(false);
    rl.recordPnl(-30);
    expect(rl.sessionHalted).toBe(true);
  });
});
