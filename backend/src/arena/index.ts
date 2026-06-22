import { Logger } from "../core";

const log = new Logger("arena");

export interface BotConfig {
  id: string;
  strategy: string;
  winRate: number;
  trades: number;
  totalPnl: number;
  active: boolean;
  createdAt: number;
  params: Record<string, unknown>;
}

export interface TradeRecord {
  botId: string;
  won: boolean;
  pnl: number;
  timestamp: number;
}

export class Arena {
  private bots: BotConfig[] = [];
  private trades: TradeRecord[] = [];
  private minTradesForEvolution: number;
  private minWinRate: number;

  constructor(opts: { minTrades?: number; minWinRate?: number } = {}) {
    this.minTradesForEvolution = opts.minTrades ?? 10;
    this.minWinRate = opts.minWinRate ?? 0.55;
  }

  registerBot(bot: BotConfig): void {
    this.bots.push(bot);
    log.info("Bot registered: " + bot.id + " [strategy=" + bot.strategy + "]");
  }

  recordTrade(botId: string, won: boolean, pnl: number): void {
    const trade: TradeRecord = { botId, won, pnl, timestamp: Date.now() };
    this.trades.push(trade);

    const bot = this.bots.find((b) => b.id === botId);
    if (bot) {
      bot.trades++;
      bot.totalPnl += pnl;
      const wins = this.trades.filter((t) => t.botId === botId && t.won).length;
      bot.winRate = (wins / bot.trades) * 100;
    }
  }

  getRanking(): BotConfig[] {
    return [...this.bots].sort((a, b) => b.totalPnl - a.totalPnl);
  }

  getBot(botId: string): BotConfig | null {
    return this.bots.find((b) => b.id === botId) || null;
  }

  findUnderperformers(): BotConfig[] {
    return this.bots.filter(
      (bot) =>
        bot.trades >= this.minTradesForEvolution &&
        bot.winRate / 100 < this.minWinRate
    );
  }

  selectParent(): BotConfig | null {
    const eligible = this.bots.filter(
      (bot) => bot.trades >= this.minTradesForEvolution && bot.active
    );
    if (eligible.length === 0) return null;

    eligible.sort((a, b) => {
      const scoreA = a.totalPnl + a.winRate;
      const scoreB = b.totalPnl + b.winRate;
      return scoreB - scoreA;
    });

    return eligible[0];
  }

  mutate(parent: BotConfig, newId: string): BotConfig {
    const mutationRate = 0.2;
    const newParams = { ...parent.params };

    for (const key of Object.keys(newParams)) {
      if (typeof newParams[key] === "number" && Math.random() < mutationRate) {
        const value = newParams[key] as number;
        const delta = value * (Math.random() * 0.4 - 0.2);
        newParams[key] = value + delta;
      }
    }

    const child: BotConfig = {
      id: newId,
      strategy: parent.strategy,
      winRate: 0,
      trades: 0,
      totalPnl: 0,
      active: true,
      createdAt: Date.now(),
      params: newParams,
    };

    log.info("Bot mutated: " + parent.id + " -> " + newId);
    return child;
  }

  evolve(): { removed: string[]; added: BotConfig[] } {
    const underperformers = this.findUnderperformers();
    if (underperformers.length === 0) {
      return { removed: [], added: [] };
    }

    const parent = this.selectParent();
    if (!parent) {
      return { removed: [], added: [] };
    }

    const removed: string[] = [];
    const added: BotConfig[] = [];

    for (const underperformer of underperformers) {
      const childId = parent.strategy + "-evo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const child = this.mutate(parent, childId);

      underperformer.active = false;
      this.registerBot(child);

      removed.push(underperformer.id);
      added.push(child);
    }

    log.info("Evolution: removed " + removed.length + ", added " + added.length);
    return { removed, added };
  }

  getBots(): BotConfig[] {
    return [...this.bots];
  }

  getActiveBots(): BotConfig[] {
    return this.bots.filter((b) => b.active);
  }
}

export const arena = new Arena();
