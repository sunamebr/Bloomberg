import { featureExtractor, type RawFeatures } from "../src/learning/features";

function testFeatureExtraction(): void {
  const input: RawFeatures = {
    entryPrice: 0.45,
    btcMomentum: 0.02,
    hour: 14,
    volume: 300,
    timeRemaining: 90,
    spread: 0.015,
    bookDepth: 500,
    volatility: 0.02,
  };

  const features = featureExtractor.extract(input);

  console.assert(features.priceBucket === "mid", "Price bucket should be mid");
  console.assert(features.momentumBucket === "medium", "Momentum bucket should be medium");
  console.assert(features.hourBucket === "afternoon", "Hour bucket should be afternoon");
  console.assert(features.volumeBucket === "medium", "Volume bucket should be medium");
  console.assert(features.timeBucket === "mid", "Time bucket should be mid");
  console.assert(features.spreadBucket === "normal", "Spread bucket should be normal");
  console.assert(features.depthBucket === "normal", "Depth bucket should be normal");
  console.assert(features.volatilityBucket === "medium", "Volatility bucket should be medium");

  console.log("✓ testFeatureExtraction passed");
}

function testFeatureFields(): void {
  const fields = featureExtractor.getFeatureFields();
  console.assert(fields.length === 8, "Should have 8 feature fields");
  console.assert(fields.includes("priceBucket"), "Should include priceBucket");
  console.assert(fields.includes("momentumBucket"), "Should include momentumBucket");

  console.log("✓ testFeatureFields passed");
}

testFeatureExtraction();
testFeatureFields();

console.log("\nAll feature tests passed!");
