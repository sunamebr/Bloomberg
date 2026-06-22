import { AlphaLab, type AlphaTrade } from "../src/alpha/lab";

function testAlphaLabBasic(): void {
  const lab = new AlphaLab();

  const trade1: AlphaTrade = {
    strategy: "test_strategy",
    market: "market-1",
    side: "BUY",
    entryPrice: 0.5,
    exitPrice: 0.6,
    size: 10,
    pnl: 1.0,
    pnlPct: 20,
    entryTime: Date.now() - 1000,
    exitTime: Date.now(),
    won: true,
  };

  const trade2: AlphaTrade = {
    strategy: "test_strategy",
    market: "market-2",
    side: "SELL",
    entryPrice: 0.6,
    exitPrice: 0.5,
    size: 10,
    pnl: 1.0,
    pnlPct: 16.7,
    entryTime: Date.now() - 2000,
    exitTime: Date.now() - 1000,
    won: true,
  };

  lab.recordTrade(trade1);
  lab.recordTrade(trade2);

  const metrics = lab.getStrategyMetrics("test_strategy");
  console.assert(metrics !== null, "Should have metrics");
  console.assert(metrics!.totalTrades === 2, "Should have 2 trades");
  console.assert(metrics!.wins === 2, "Should have 2 wins");
  console.assert(metrics!.winRate === 100, "Win rate should be 100%");
  console.assert(metrics!.totalPnl === 2.0, "Total PnL should be 2.0");

  console.log("✓ testAlphaLabBasic passed");
}

function testAlphaLabMixed(): void {
  const lab = new AlphaLab();

  const trades: AlphaTrade[] = [
    {
      strategy: "test_strategy",
      market: "market-1",
      side: "BUY",
      entryPrice: 0.5,
      exitPrice: 0.6,
      size: 10,
      pnl: 1.0,
      pnlPct: 20,
      entryTime: Date.now() - 3000,
      exitTime: Date.now() - 2000,
      won: true,
    },
    {
      strategy: "test_strategy",
      market: "market-2",
      side: "BUY",
      entryPrice: 0.6,
      exitPrice: 0.5,
      size: 10,
      pnl: -1.0,
      pnlPct: -16.7,
      entryTime: Date.now() - 2000,
      exitTime: Date.now() - 1000,
      won: false,
    },
  ];

  for (const trade of trades) {
    lab.recordTrade(trade);
  }

  const metrics = lab.getStrategyMetrics("test_strategy");
  console.assert(metrics !== null, "Should have metrics");
  console.assert(metrics!.totalTrades === 2, "Should have 2 trades");
  console.assert(metrics!.wins === 1, "Should have 1 win");
  console.assert(metrics!.losses === 1, "Should have 1 loss");
  console.assert(metrics!.winRate === 50, "Win rate should be 50%");
  console.assert(metrics!.totalPnl === 0, "Total PnL should be 0");

  console.log("✓ testAlphaLabMixed passed");
}

// Run tests
testAlphaLabBasic();
testAlphaLabMixed();

console.log("\\nAll alpha lab tests passed!");
