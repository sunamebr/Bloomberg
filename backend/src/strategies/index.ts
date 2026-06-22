import { registry } from "./registry";
import { lateEntry } from "./late-entry";
import { momentum } from "./momentum";
import { meanReversion } from "./mean-reversion";
import { hybrid } from "./hybrid";
import { feeZoneMaker } from "./fee-zone-maker";
import { sniper } from "./sniper";

registry.register({ name: "late-entry", description: "RSI/ATR/PGR gated late entry", factory: lateEntry });
registry.register({ name: "momentum", description: "BTC spot momentum", factory: momentum });
registry.register({ name: "mean-reversion", description: "Bollinger + RSI + z-score", factory: meanReversion });
registry.register({ name: "hybrid", description: "Ensemble momentum + mean rev + RSI", factory: hybrid });
registry.register({ name: "fee-zone-maker", description: "Fee-aware directional maker 60-82c", factory: feeZoneMaker });
registry.register({ name: "sniper", description: "High-WR selective trading", factory: sniper });

export { registry };
export type { Strategy, StrategyContext, StrategyConfig, SlotInfo } from "./types";
export { bookFeatures } from "./book-features";
export type { BookInput, BookFeatures } from "./book-features";
export * from "./indicators";
