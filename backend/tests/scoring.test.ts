import { BotScorer } from "../src/arena/scoring";

function testBotScorerBasic(): void {
  const scorer = new BotScorer();

  const trades = [
    { won: true, pnl: 1.0 },
    { won: true, pnl: 0.5 },
    { won: false, pnl: -0.5 },
  ];

  const score = scorer.updateScore("bot-1", "test_strategy", trades);

  console.assert(score.totalTrades === 3, "Should have 3 trades");
  console.assert(score.wins === 2, "Should have 2 wins");
  console.assert(score.losses === 1, "Should have 1 loss");
  console.assert(score.winRate > 60, "Win rate should be > 60%");
  console.assert(score.totalPnl === 1.0, "Total PnL should be 1.0");

  console.log("✓ testBotScorerBasic passed");
}

function testBotScorerRanking(): void {
  const scorer = new BotScorer();

  scorer.updateScore("bot-1", "strat-a", [{ won: true, pnl: 5.0 }]);
  scorer.updateScore("bot-2", "strat-b", [{ won: true, pnl: 2.0 }]);
  scorer.updateScore("bot-3", "strat-c", [{ won: false, pnl: -1.0 }]);

  const ranking = scorer.getRanking();
  console.assert(ranking.length === 3, "Should have 3 bots");
  console.assert(ranking[0].botId === "bot-1", "Top bot should be bot-1");

  console.log("✓ testBotScorerRanking passed");
}

testBotScorerBasic();
testBotScorerRanking();

console.log("\nAll scoring tests passed!");
