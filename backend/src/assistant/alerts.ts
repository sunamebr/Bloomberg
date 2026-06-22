import { Logger } from "../core";
import type { Alert, AlertLevel } from "./index";

const log = new Logger("alerts");

export interface AlertRule {
  id: string;
  level: AlertLevel;
  condition: (data: Record<string, unknown>) => boolean;
  message: (data: Record<string, unknown>) => string;
  cooldownMs?: number;
}

export class AlertManager {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private lastTriggered: Map<string, number> = new Map();
  private maxAlerts: number;

  constructor(maxAlerts: number = 100) {
    this.maxAlerts = maxAlerts;
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    log.info("Alert rule added: " + rule.id);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
    log.info("Alert rule removed: " + id);
  }

  evaluate(data: Record<string, unknown>): Alert[] {
    const now = Date.now();
    const newAlerts: Alert[] = [];

    for (const rule of this.rules) {
      const lastTrigger = this.lastTriggered.get(rule.id) || 0;
      const cooldown = rule.cooldownMs ?? 0;

      if (now - lastTrigger < cooldown) continue;

      try {
        if (rule.condition(data)) {
          const alert: Alert = {
            level: rule.level,
            type: rule.id,
            message: rule.message(data),
            timestamp: now,
          };
          newAlerts.push(alert);
          this.lastTriggered.set(rule.id, now);
        }
      } catch (error) {
        log.error("Alert rule " + rule.id + " failed: " + (error instanceof Error ? error.message : String(error)));
      }
    }

    this.alerts.push(...newAlerts);

    while (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    return newAlerts;
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getRecentAlerts(limit: number = 20): Alert[] {
    return this.alerts.slice(-limit).reverse();
  }

  getByLevel(level: AlertLevel): Alert[] {
    return this.alerts.filter((a) => a.level === level);
  }

  clear(): void {
    this.alerts = [];
    this.lastTriggered.clear();
    log.info("Alerts cleared");
  }
}

export const alertManager = new AlertManager();
