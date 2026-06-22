export interface CostGateInput {
  expectedMoveBps: number;
  spreadBps: number;
  feeBps?: number;
  slippageBps?: number;
  latencyRiskBps?: number;
  minProfitBufferBps?: number;
}

export interface CostGateResult {
  ok: boolean;
  roundTripCostBps: number;
  requiredMoveBps: number;
  expectedMoveBps: number;
  edgeAfterCostBps: number;
  rejectReason: string;
}

export function costGate(input: CostGateInput): CostGateResult {
  const feeBps = input.feeBps ?? 0;
  const slippageBps = input.slippageBps ?? 5;
  const latencyRiskBps = input.latencyRiskBps ?? 5;
  const minProfitBufferBps = input.minProfitBufferBps ?? 2;

  const roundTripCostBps = input.spreadBps + feeBps + slippageBps + latencyRiskBps;
  const requiredMoveBps = roundTripCostBps + minProfitBufferBps;
  const edgeAfterCostBps = input.expectedMoveBps - requiredMoveBps;

  return {
    ok: edgeAfterCostBps > 0,
    roundTripCostBps,
    requiredMoveBps,
    expectedMoveBps: input.expectedMoveBps,
    edgeAfterCostBps,
    rejectReason: edgeAfterCostBps > 0 ? "" : "expected_edge_below_roundtrip_cost",
  };
}
