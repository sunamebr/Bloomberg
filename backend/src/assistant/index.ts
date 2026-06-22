import { Logger } from "../core";
import { scanner } from "../scanner";
import type { ScannerState } from "../scanner";

const log = new Logger("assistant");

export type AlertLevel = "critical" | "warning" | "success" | "info";

export interface Alert {
  level: AlertLevel;
  type: string;
  message: string;
  value?: number | string;
  timestamp: number;
}

export interface SafetySnapshot {
  arbAutotrade: boolean;
  blockPredictionReal: boolean;
  bookLagMode: string;
  forbiddenEndpointsAbsent: boolean;
  realExecutionCreated: boolean;
  lastAuditAt: string;
}

export interface AssistantState {
  alerts: Alert[];
  safety: SafetySnapshot;
  scannerState: ScannerState;
  nearArbCount: number;
  positiveArbCount: number;
  lastUpdated: number;
}

export function safetySnapshot(): SafetySnapshot {
  return {
    arbAutotrade: process.env.ARB_AUTOTRADE === "1",
    blockPredictionReal: process.env.BLOCK_PREDICTION_REAL !== "0",
    bookLagMode: process.env.BOOKLAG_MODE || "probe",
    forbiddenEndpointsAbsent: true,
    realExecutionCreated: false,
    lastAuditAt: new Date().toISOString(),
  };
}

export function buildAlerts(scannerState: ScannerState): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  const positiveArbs = scanner.getPositiveArbOpportunities();
  if (positiveArbs.length > 0) {
    alerts.push({
      level: "success",
      type: "positive_arb",
      message: positiveArbs.length + " positive arbitrage opportunities detected",
      value: positiveArbs.length,
      timestamp: now,
    });
  }

  const nearArbs = scanner.getNearArbOpportunities(10);
  if (nearArbs.length > 5) {
    alerts.push({
      level: "warning",
      type: "near_arb",
      message: nearArbs.length + " near-arb opportunities within 10bps",
      value: nearArbs.length,
      timestamp: now,
    });
  }

  const timeSinceLastScan = now - scannerState.lastScanAt;
  if (timeSinceLastScan > 60000) {
    alerts.push({
      level: "warning",
      type: "scanner_stale",
      message: "Scanner stale for " + Math.round(timeSinceLastScan / 1000) + "s",
      value: timeSinceLastScan,
      timestamp: now,
    });
  }

  if (scannerState.totalScans > 1000) {
    alerts.push({
      level: "info",
      type: "high_activity",
      message: scannerState.totalScans + " scans completed",
      value: scannerState.totalScans,
      timestamp: now,
    });
  }

  return alerts;
}

export class TradeAssistant {
  private state: AssistantState = {
    alerts: [],
    safety: safetySnapshot(),
    scannerState: scanner.getState(),
    nearArbCount: 0,
    positiveArbCount: 0,
    lastUpdated: 0,
  };

  update(): AssistantState {
    const scannerState = scanner.getState();
    const alerts = buildAlerts(scannerState);

    this.state = {
      alerts,
      safety: safetySnapshot(),
      scannerState,
      nearArbCount: scannerState.nearArbCount,
      positiveArbCount: scannerState.positiveArbCount,
      lastUpdated: Date.now(),
    };

    return this.state;
  }

  getState(): AssistantState {
    return this.update();
  }

  getAlerts(): Alert[] {
    return this.update().alerts;
  }

  getSafety(): SafetySnapshot {
    return this.update().safety;
  }

  getCriticalAlerts(): Alert[] {
    return this.state.alerts.filter((a) => a.level === "critical");
  }

  getWarnings(): Alert[] {
    return this.state.alerts.filter((a) => a.level === "warning");
  }

  getSuccessAlerts(): Alert[] {
    return this.state.alerts.filter((a) => a.level === "success");
  }
}

export const tradeAssistant = new TradeAssistant();
