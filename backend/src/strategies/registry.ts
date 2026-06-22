import type { Strategy, StrategyConfig } from "./types";

class StrategyRegistryClass {
  private strategies = new Map<string, StrategyConfig>();
  private enabled = new Map<string, boolean>();

  register(config: StrategyConfig): void {
    this.strategies.set(config.name, config);
    this.enabled.set(config.name, true);
  }

  get(name: string): Strategy | undefined {
    return this.strategies.get(name)?.factory;
  }

  isEnabled(name: string): boolean {
    return this.enabled.get(name) ?? false;
  }

  setEnabled(name: string, enabled: boolean): boolean {
    if (!this.strategies.has(name)) return false;
    this.enabled.set(name, enabled);
    return true;
  }

  list(): string[] {
    return [...this.strategies.keys()];
  }

  all(): StrategyConfig[] {
    return [...this.strategies.values()];
  }

  status(): { name: string; description: string; enabled: boolean }[] {
    return [...this.strategies.values()].map((s) => ({
      name: s.name,
      description: s.description,
      enabled: this.isEnabled(s.name),
    }));
  }
}

export const registry = new StrategyRegistryClass();
