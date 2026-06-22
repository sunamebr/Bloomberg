import { Logger } from "../core";

const log = new Logger("redeem");

export interface RedeemConfig {
  builderKey: string;
  builderSecret: string;
  builderPassphrase: string;
}

export interface RedeemResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class Redeemer {
  constructor(private config: RedeemConfig) {}

  async redeem(conditionId: string, tokenIds: string[]): Promise<RedeemResult> {
    log.info("Redeem requested for condition " + conditionId + ", tokens: " + tokenIds.join(", "));
    return { success: false, error: "not_implemented" };
  }
}

export class Merger {
  constructor(private config: RedeemConfig) {}

  async merge(tokenIds: string[], amounts: number[]): Promise<RedeemResult> {
    log.info("Merge requested for " + tokenIds.length + " tokens");
    return { success: false, error: "not_implemented" };
  }
}

export class PUsdConverter {
  constructor(private config: RedeemConfig) {}

  async convert(amount: number): Promise<RedeemResult> {
    log.info("pUSD conversion requested for " + amount + " USDC");
    return { success: false, error: "not_implemented" };
  }
}
