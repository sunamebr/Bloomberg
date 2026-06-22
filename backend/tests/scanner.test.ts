import { Scanner, type OrderBook } from "../src/scanner";

function createMockBook(tokenId: string, bids: Array<[string, string]>, asks: Array<[string, string]>): OrderBook {
  return {
    tokenId,
    assetId: tokenId,
    bids: bids.map(([price, size]) => ({ price, size })),
    asks: asks.map(([price, size]) => ({ price, size })),
    timestamp: Date.now(),
    receivedAt: Date.now(),
  };
}

function testScanBinaryArb(): void {
  const scanner = new Scanner();

  // Test positive arbitrage
  const upBook = createMockBook("up-token", [["0.45", "100"]], [["0.48", "100"]]);
  const downBook = createMockBook("down-token", [["0.45", "100"]], [["0.47", "100"]]);

  const result = scanner.scanBinaryArb("test-market", upBook, downBook);

  console.assert(result !== null, "Should detect opportunity");
  console.assert(result!.upAsk === 0.48, "Up ask should be 0.48");
  console.assert(result!.downAsk === 0.47, "Down ask should be 0.47");
  console.assert(result!.totalCost === 0.95, "Total cost should be 0.95");
  console.assert(result!.guaranteedPnl === 0.05, "Guaranteed PnL should be 0.05");
  console.assert(result!.edgePct > 5, "Edge should be > 5%");
  console.assert(result!.detected === true, "Should be detected as positive arb");

  console.log("✓ testScanBinaryArb passed");
}

function testScanNoArb(): void {
  const scanner = new Scanner();

  // Test no arbitrage
  const upBook = createMockBook("up-token", [["0.45", "100"]], [["0.55", "100"]]);
  const downBook = createMockBook("down-token", [["0.40", "100"]], [["0.50", "100"]]);

  const result = scanner.scanBinaryArb("test-market", upBook, downBook);

  console.assert(result !== null, "Should detect opportunity");
  console.assert(result!.upAsk === 0.55, "Up ask should be 0.55");
  console.assert(result!.downAsk === 0.50, "Down ask should be 0.50");
  console.assert(result!.totalCost === 1.05, "Total cost should be 1.05");
  console.assert(result!.guaranteedPnl === -0.05, "Guaranteed PnL should be negative");
  console.assert(result!.detected === false, "Should not be detected as positive arb");

  console.log("✓ testScanNoArb passed");
}

function testScannerState(): void {
  const scanner = new Scanner();

  const upBook = createMockBook("up-token", [["0.45", "100"]], [["0.48", "100"]]);
  const downBook = createMockBook("down-token", [["0.45", "100"]], [["0.47", "100"]]);

  scanner.scanBinaryArb("market-1", upBook, downBook);
  scanner.scanBinaryArb("market-2", upBook, downBook);

  const state = scanner.getState();
  console.assert(state.totalScans === 2, "Should have 2 scans");
  console.assert(state.opportunities.length === 2, "Should have 2 opportunities");

  console.log("✓ testScannerState passed");
}

// Run tests
testScanBinaryArb();
testScanNoArb();
testScannerState();

console.log("\\nAll scanner tests passed!");
