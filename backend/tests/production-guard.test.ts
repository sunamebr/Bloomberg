import { productionGuard, emptyDailyState, defaultConfig, type Signal } from "../src/production/guard";

function testProductionGuardBasic(): void {
  const state = emptyDailyState();
  const config = defaultConfig();
  config.enabled = true;
  config.killSwitch = false;
  config.allowedStrategies = ["test_strategy"];

  const signal: Signal = {
    strategy: "test_strategy",
    market: "test-market",
    side: "BUY",
    size: 10,
    price: 0.5,
    bookAgeMs: 500,
    spreadBps: 50,
    timestamp: Date.now(),
  };

  const result = productionGuard(signal, state, config);
  console.assert(result.allowed === true, "Should allow trade");
  console.assert(result.reason === "ok", "Reason should be ok");

  console.log("✓ testProductionGuardBasic passed");
}

function testProductionGuardKillSwitch(): void {
  const state = emptyDailyState();
  const config = defaultConfig();
  config.enabled = true;
  config.killSwitch = true;

  const signal: Signal = {
    strategy: "test_strategy",
    market: "test-market",
    side: "BUY",
    size: 10,
    price: 0.5,
    bookAgeMs: 500,
    spreadBps: 50,
    timestamp: Date.now(),
  };

  const result = productionGuard(signal, state, config);
  console.assert(result.allowed === false, "Should block trade");
  console.assert(result.reason === "kill_switch_active", "Reason should be kill_switch_active");

  console.log("✓ testProductionGuardKillSwitch passed");
}

function testProductionGuardDailyLossLimit(): void {
  const state = emptyDailyState();
  state.dailyPnl = -3; // Already lost 

  const config = defaultConfig();
  config.enabled = true;
  config.killSwitch = false;
  config.maxDailyLossUsd = 2;
  config.allowedStrategies = ["test_strategy"];

  const signal: Signal = {
    strategy: "test_strategy",
    market: "test-market",
    side: "BUY",
    size: 10,
    price: 0.5,
    bookAgeMs: 500,
    spreadBps: 50,
    timestamp: Date.now(),
  };

  const result = productionGuard(signal, state, config);
  console.assert(result.allowed === false, "Should block trade");
  console.assert(result.reason === "daily_loss_limit", "Reason should be daily_loss_limit");

  console.log("✓ testProductionGuardDailyLossLimit passed");
}

function testProductionGuardCooldown(): void {
  const state = emptyDailyState();
  state.lastTradeAt = Date.now() - 10000; // 10 seconds ago

  const config = defaultConfig();
  config.enabled = true;
  config.killSwitch = false;
  config.cooldownMs = 30000; // 30 second cooldown
  config.allowedStrategies = ["test_strategy"];

  const signal: Signal = {
    strategy: "test_strategy",
    market: "test-market",
    side: "BUY",
    size: 10,
    price: 0.5,
    bookAgeMs: 500,
    spreadBps: 50,
    timestamp: Date.now(),
  };

  const result = productionGuard(signal, state, config);
  console.assert(result.allowed === false, "Should block trade");
  console.assert(result.reason === "cooldown_active", "Reason should be cooldown_active");

  console.log("✓ testProductionGuardCooldown passed");
}

// Run tests
testProductionGuardBasic();
testProductionGuardKillSwitch();
testProductionGuardDailyLossLimit();
testProductionGuardCooldown();

console.log("\\nAll production guard tests passed!");
