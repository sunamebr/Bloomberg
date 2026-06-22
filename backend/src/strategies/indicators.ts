export class RSI {
  private gains: number[] = [];
  private losses: number[] = [];
  private avgGain = 0;
  private avgLoss = 0;
  private count = 0;
  private lastValue = 0;

  constructor(private period: number = 14) {}

  update(value: number): number | null {
    this.count++;
    if (this.count === 1) {
      this.lastValue = value;
      return null;
    }

    const change = value - this.lastValue;
    this.lastValue = value;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    this.gains.push(gain);
    this.losses.push(loss);

    if (this.count <= this.period + 1) {
      this.avgGain = this.gains.slice(0, this.period).reduce((a, b) => a + b, 0) / this.period;
      this.avgLoss = this.losses.slice(0, this.period).reduce((a, b) => a + b, 0) / this.period;
    } else {
      this.avgGain = (this.avgGain * (this.period - 1) + gain) / this.period;
      this.avgLoss = (this.avgLoss * (this.period - 1) + loss) / this.period;
    }

    if (this.avgLoss === 0) return 100;
    const rs = this.avgGain / this.avgLoss;
    return 100 - 100 / (1 + rs);
  }

  reset(): void {
    this.gains = [];
    this.losses = [];
    this.avgGain = 0;
    this.avgLoss = 0;
    this.count = 0;
    this.lastValue = 0;
  }
}

export class ATR {
  private values: number[] = [];
  private atr: number | null = null;

  constructor(private period: number = 14) {}

  update(value: number): number | null {
    const prev = this.values.length > 0 ? this.values[this.values.length - 1] : value;
    this.values.push(value);
    const move = Math.abs(value - prev);
    if (this.values.length <= this.period) {
      const sum = this.values
        .slice(1)
        .reduce((acc, v, i) => acc + Math.abs(v - this.values[i]), 0);
      this.atr = sum / Math.max(1, this.values.length - 1);
    } else {
      this.atr = ((this.atr ?? 0) * (this.period - 1) + move) / this.period;
    }
    return this.atr;
  }

  reset(): void {
    this.values = [];
    this.atr = null;
  }
}

export class RollingVolatility {
  private values: number[] = [];

  constructor(private windowSize: number = 30) {}

  update(value: number): number | null {
    this.values.push(value);
    if (this.values.length > this.windowSize) this.values.shift();
    if (this.values.length < 2) return null;
    const mean = this.values.reduce((a, b) => a + b, 0) / this.values.length;
    const variance = this.values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / this.values.length;
    return Math.sqrt(variance);
  }

  reset(): void {
    this.values = [];
  }
}

export function peakGapRatio(currentGap: number, peakGap: number): number {
  if (peakGap === 0) return 0;
  return Math.abs(currentGap) / Math.abs(peakGap);
}

export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function bollingerBands(
  values: number[],
  period = 20,
  multiplier = 2,
): { upper: number; middle: number; lower: number } | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, v) => acc + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: middle + multiplier * stdDev, middle, lower: middle - multiplier * stdDev };
}
