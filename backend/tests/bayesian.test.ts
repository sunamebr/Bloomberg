import { BayesianEngine, extractFeatures, type FeatureInput } from "../src/learning/bayesian";

function testExtractFeatures(): void {
  const input: FeatureInput = {
    entryPrice: 0.45,
    btcMomentum: 0.02,
    hour: 14,
    volume: 300,
    timeRemaining: 90,
  };

  const features = extractFeatures(input);

  console.assert(features.priceBucket === "mid", "Price bucket should be mid");
  console.assert(features.momentumBucket === "medium", "Momentum bucket should be medium");
  console.assert(features.hourBucket === "afternoon", "Hour bucket should be afternoon");
  console.assert(features.volumeBucket === "medium", "Volume bucket should be medium");
  console.assert(features.timeBucket === "mid", "Time bucket should be mid");

  console.log("✓ testExtractFeatures passed");
}

function testBayesianEngine(): void {
  const engine = new BayesianEngine();

  const features = {
    priceBucket: "mid",
    momentumBucket: "medium",
    hourBucket: "afternoon",
    volumeBucket: "medium",
    timeBucket: "mid",
  };

  // Record winning trades
  for (let i = 0; i < 3; i++) {
    engine.recordTrade(features, true);
  }

  // Record losing trades
  for (let i = 0; i < 2; i++) {
    engine.recordTrade(features, false);
  }

  const winRate = engine.winRate(features);
  console.assert(winRate !== null, "Should have win rate");
  console.assert(winRate! === 0.6, "Win rate should be 60%");
  console.assert(engine.totalTrades === 5, "Should have 5 total trades");

  console.log("✓ testBayesianEngine passed");
}

function testBayesianFeatureAnalysis(): void {
  const engine = new BayesianEngine();

  // Record trades with different price buckets
  for (let i = 0; i < 5; i++) {
    engine.recordTrade({
      priceBucket: "low",
      momentumBucket: "medium",
      hourBucket: "morning",
      volumeBucket: "medium",
      timeBucket: "mid",
    }, true);
  }

  for (let i = 0; i < 3; i++) {
    engine.recordTrade({
      priceBucket: "high",
      momentumBucket: "medium",
      hourBucket: "morning",
      volumeBucket: "medium",
      timeBucket: "mid",
    }, true);
  }

  const analysis = engine.getFeatureAnalysis("priceBucket");
  console.assert(analysis.length > 0, "Should have feature analysis");

  const lowBucket = analysis.find((a) => a.value === "low");
  console.assert(lowBucket !== undefined, "Should have low bucket");
  console.assert(lowBucket!.winRate === 1.0, "Low bucket win rate should be 100%");

  console.log("✓ testBayesianFeatureAnalysis passed");
}

// Run tests
testExtractFeatures();
testBayesianEngine();
testBayesianFeatureAnalysis();

console.log("\\nAll bayesian tests passed!");
