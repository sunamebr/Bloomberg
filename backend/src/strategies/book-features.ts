export interface BookInput {
  yesBid: number | null;
  yesAsk: number | null;
  noBid: number | null;
  noAsk: number | null;
  yesBidDepth: number;
  yesAskDepth: number;
  noBidDepth: number;
  noAskDepth: number;
}

export interface BookFeatures {
  yesBid: number | null;
  yesAsk: number | null;
  noBid: number | null;
  noAsk: number | null;
  yesSpread: number | null;
  noSpread: number | null;
  rawAskSum: number | null;
  yesBidDepth: number;
  yesAskDepth: number;
  noBidDepth: number;
  noAskDepth: number;
  yesImbalance: number;
  noImbalance: number;
  yesMicroprice: number | null;
  noMicroprice: number | null;
  maxSafeSize: number;
}

export function bookFeatures(input: BookInput): BookFeatures {
  const yesSpread = input.yesAsk != null && input.yesBid != null ? input.yesAsk - input.yesBid : null;
  const noSpread = input.noAsk != null && input.noBid != null ? input.noAsk - input.noBid : null;
  const rawAskSum = input.yesAsk != null && input.noAsk != null ? input.yesAsk + input.noAsk : null;

  const totalYes = input.yesBidDepth + input.yesAskDepth;
  const yesImbalance = totalYes > 0 ? (input.yesBidDepth - input.yesAskDepth) / totalYes : 0;

  const totalNo = input.noBidDepth + input.noAskDepth;
  const noImbalance = totalNo > 0 ? (input.noBidDepth - input.noAskDepth) / totalNo : 0;

  const yesMicroprice =
    input.yesBid != null && input.yesAsk != null && totalYes > 0
      ? (input.yesAsk * input.yesBidDepth + input.yesBid * input.yesAskDepth) / totalYes
      : null;

  const noMicroprice =
    input.noBid != null && input.noAsk != null && totalNo > 0
      ? (input.noAsk * input.noBidDepth + input.noBid * input.noAskDepth) / totalNo
      : null;

  return {
    ...input,
    yesSpread,
    noSpread,
    rawAskSum,
    yesImbalance,
    noImbalance,
    yesMicroprice,
    noMicroprice,
    maxSafeSize: Math.min(input.yesAskDepth || 0, input.noAskDepth || 0),
  };
}
