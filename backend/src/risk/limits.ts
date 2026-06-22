interface RiskLimitsConfig {
  maxSessionLoss: number;
  maxDailyLossPerBot: number;
}

export class RiskLimits {
  private _sessionPnl = 0;
  private _botPnl = new Map<string, number>();
  private _halted = false;

  constructor(private config: RiskLimitsConfig) {}

  get sessionPnl(): number { return this._sessionPnl; }
  get sessionHalted(): boolean { return this._halted; }

  recordPnl(amount: number): void {
    this._sessionPnl += amount;
    if (this._sessionPnl < -this.config.maxSessionLoss) {
      this._halted = true;
    }
  }

  recordBotPnl(botId: string, amount: number): void {
    const current = this._botPnl.get(botId) ?? 0;
    this._botPnl.set(botId, current + amount);
    this.recordPnl(amount);
  }

  canTrade(botId: string): boolean {
    if (this._halted) return false;
    const botPnl = this._botPnl.get(botId) ?? 0;
    if (botPnl < -this.config.maxDailyLossPerBot) return false;
    return true;
  }

  reset(): void {
    this._sessionPnl = 0;
    this._botPnl.clear();
    this._halted = false;
  }
}
