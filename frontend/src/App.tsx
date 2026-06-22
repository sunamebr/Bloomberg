import { useEffect, useMemo, useState } from "react";
import Login from "./components/Login";
import Header from "./components/Header";
import {
  getCurrentUser,
  getHealth,
  getLedger,
  getConnections,
  getOperations,
  getPositions,
  getSignals,
  getStatus,
  getWallet,
  isAuthenticated,
  logout as apiLogout,
  toggleMode,
  toggleStrategy,
  type HealthResponse,
  type LedgerRow,
  type ConnectionItem,
  type ConnectionReport,
  type OperationRow,
  type PositionRow,
  type SignalRow,
  type StatusResponse,
  type StrategyStatus,
  type WalletSnapshot,
  type User,
} from "./services/api";

interface DashboardData {
  health: HealthResponse | null;
  status: StatusResponse | null;
  wallet: WalletSnapshot | null;
  connections: ConnectionReport | null;
  positions: PositionRow[];
  signals: SignalRow[];
  ledger: LedgerRow[];
  operations: OperationRow[];
}

const emptyData: DashboardData = {
  health: null,
  status: null,
  wallet: null,
  connections: null,
  positions: [],
  signals: [],
  ledger: [],
  operations: [],
};

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface EthereumWindow extends Window {
  ethereum?: EthereumProvider;
}

function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown, digits = 2): string {
  return `$${numeric(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function tokenAmount(value: unknown, digits = 4): string {
  return numeric(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function pct(value: unknown): string {
  const n = numeric(value);
  if (n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

function shortId(value: string | undefined): string {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function timeAgo(value: string | number | null | undefined): string {
  if (!value) return "never";
  const ts = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [watchedWallet, setWatchedWallet] = useState<string | null>(() => localStorage.getItem("watched_wallet"));

  const authenticated = Boolean(user);

  async function checkAuth(): Promise<void> {
    if (isAuthenticated()) {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    }
    setAuthChecked(true);
  }

  async function refreshDashboard(): Promise<void> {
    setLoadingDashboard(true);
    try {
      const [health, status, wallet, connections, positions, signals, ledger, operations] = await Promise.all([
        getHealth(),
        getStatus(),
        getWallet(watchedWallet),
        getConnections(watchedWallet),
        getPositions(100),
        getSignals(100),
        getLedger(200),
        getOperations(100),
      ]);
      setData({ health, status, wallet, connections, positions, signals, ledger, operations });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "dashboard_refresh_failed");
    } finally {
      setLoadingDashboard(false);
    }
  }

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    void refreshDashboard();
    const id = window.setInterval(() => {
      void refreshDashboard();
    }, 5000);
    return () => window.clearInterval(id);
  }, [authenticated, watchedWallet]);

  const totals = useMemo(() => {
    const pnl = data.ledger.reduce((sum, row) => sum + numeric(row.pnl_usd), 0);
    const fees = data.ledger.reduce((sum, row) => sum + numeric(row.fee_usd), 0);
    const notional = data.ledger.reduce((sum, row) => sum + numeric(row.shares) * numeric(row.price), 0);
    const exposure = data.positions.reduce((sum, row) => sum + numeric(row.shares) * numeric(row.avg_price), 0);
    const enabled = data.status?.strategies.filter((strategy) => strategy.enabled).length ?? 0;
    const totalStrategies = data.status?.strategies.length ?? 0;
    return { pnl, fees, notional, exposure, enabled, totalStrategies };
  }, [data]);

  async function handleLogin(): Promise<void> {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }

  async function handleLogout(): Promise<void> {
    await apiLogout();
    setUser(null);
    setData(emptyData);
  }

  function handleWatchWallet(address: string | null): void {
    const normalized = address?.trim() || null;
    setWatchedWallet(normalized);
    if (normalized) localStorage.setItem("watched_wallet", normalized);
    else localStorage.removeItem("watched_wallet");
  }

  async function handleConnectBrowserWallet(): Promise<void> {
    const provider = (window as EthereumWindow).ethereum;
    if (!provider) {
      setActionMessage("Browser wallet not detected");
      return;
    }
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const first = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
      if (!first) {
        setActionMessage("No wallet account returned");
        return;
      }
      handleWatchWallet(first);
      setActionMessage("Wallet connected for balance watch");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "wallet_connect_failed");
    }
  }

  async function handleStrategyToggle(strategy: StrategyStatus): Promise<void> {
    try {
      const next = !strategy.enabled;
      await toggleStrategy(strategy.name, next);
      setActionMessage(`${strategy.name} ${next ? "enabled" : "disabled"}`);
      await refreshDashboard();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "strategy_toggle_failed");
    }
  }

  async function handleModeToggle(): Promise<void> {
    const paperMode = data.status?.paperMode ?? data.health?.paperMode ?? true;
    const label = paperMode ? "LIVE" : "PAPER";
    const confirmed = window.confirm(`Confirm switch to ${label} mode? Live mode can risk real funds.`);
    if (!confirmed) return;

    try {
      const result = await toggleMode();
      setActionMessage(result.paperMode ? "Switched to paper mode" : "Switched to live mode");
      await refreshDashboard();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "mode_toggle_failed");
    }
  }

  if (!authChecked) {
    return (
      <div className="loading-screen">
        <span className="pulse-dot status-dot ok" />
        <span>Loading terminal</span>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const paperMode = data.status?.paperMode ?? data.health?.paperMode ?? true;
  const capital = data.status?.capital;
  const strategies = data.status?.strategies ?? [];
  const recentSignals = data.signals.slice(0, 8);
  const recentLedger = data.ledger.slice(0, 8);
  const openPositions = data.positions.slice(0, 8);
  const operations = data.operations.slice(0, 18);
  const connections = data.connections?.connections ?? [];
  const wallet = data.wallet;

  return (
    <div className="app-shell">
      <div className="terminal-wrap">
        <Header
          onLogout={handleLogout}
          username={user.username}
          paperMode={paperMode}
          dbOk={Boolean(data.health?.db)}
          wsConnected={Boolean(data.health?.ws.connected)}
          marketLabel={`${capital?.asset ?? "BTC"} ${capital?.window ?? "5m"}`}
          fills={data.ledger.length}
        />

        <div className="workspace-grid">
          <main className="dashboard-grid">
            <section className="hero-panel">
              <div>
                <p className="eyebrow">MestraDosTrades terminal</p>
                <h1>Polymarket 5m edge engine</h1>
                <p className="hero-copy">
                  Paper-first execution layer for BTC Up/Down markets with risk gates,
                  strategy toggles, open positions and ledger audit in one cockpit.
                </p>
              </div>
              <div className="hero-actions">
                <button className={`mode-button ${paperMode ? "paper" : "live"}`} onClick={handleModeToggle}>
                  {paperMode ? "Paper mode" : "Live mode"}
                </button>
                <button className="ghost-button" onClick={() => void refreshDashboard()}>
                  Refresh
                </button>
              </div>
            </section>

            <section className="metric-row">
              <Metric label="Net PnL" value={money(totals.pnl)} tone={totals.pnl >= 0 ? "good" : "bad"} />
              <Metric label="Open exposure" value={money(totals.exposure)} sub={`Cap ${money(capital?.maxCapUsd ?? 0, 0)}`} />
              <Metric label="Fees paid" value={money(totals.fees)} sub={`${money(totals.notional)} notional`} />
              <Metric label="Strategies" value={`${totals.enabled}/${totals.totalStrategies}`} sub="enabled" />
            </section>

            <section className="status-strip">
              <StatusPill label="DB" ok={Boolean(data.health?.db)} />
              <StatusPill label="WS" ok={Boolean(data.health?.ws.connected)} />
              <StatusPill label="Mode" ok={paperMode} text={paperMode ? "paper" : "live"} />
              <StatusPill label="Last feed" ok={Boolean(data.health?.ws.lastMessageAt)} text={timeAgo(data.health?.ws.lastMessageAt)} />
              {loadingDashboard && <span className="refreshing">refreshing</span>}
              {error && <span className="error-text">{error}</span>}
              {actionMessage && <span className="action-text">{actionMessage}</span>}
            </section>

            <section className="panel two-span">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">5m strategy matrix</p>
                  <h2>Execution gates</h2>
                </div>
              </div>
              <div className="strategy-list">
                {strategies.map((strategy) => (
                  <label className="strategy-row" key={strategy.name}>
                    <input
                      type="checkbox"
                      checked={strategy.enabled}
                      onChange={() => void handleStrategyToggle(strategy)}
                    />
                    <span>
                      <strong>{strategy.name}</strong>
                      <small>{strategy.description}</small>
                    </span>
                  </label>
                ))}
                {strategies.length === 0 && <EmptyState text="No strategies registered yet." />}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Signal tape</p>
                  <h2>Recent alpha</h2>
                </div>
              </div>
              <div className="signal-tape">
                {recentSignals.map((signal, index) => (
                  <div className="signal-row" key={`${signal.strategy}-${signal.created_at ?? index}`}>
                    <span className={`side-chip ${signal.side.toLowerCase()}`}>{signal.side}</span>
                    <span>{signal.strategy}</span>
                    <strong>{money(signal.price, 3)}</strong>
                    <small>{pct(signal.confidence ?? 0)}</small>
                  </div>
                ))}
                {recentSignals.length === 0 && <EmptyState text="Waiting for paper signals." />}
              </div>
            </section>

            <TablePanel
              title="Open positions"
              eyebrow="Risk book"
              empty="No open positions."
              columns={["asset", "side", "shares", "avg", "market", "opened"]}
              rows={openPositions.map((position) => [
                `${position.asset} ${position.window_type}`,
                position.side,
                numeric(position.shares).toFixed(2),
                money(position.avg_price, 3),
                shortId(position.market_id),
                timeAgo(position.opened_at),
              ])}
            />

            <TablePanel
              title="Ledger"
              eyebrow="Audit trail"
              empty="Ledger is empty."
              columns={["strategy", "side", "shares", "price", "fee", "pnl"]}
              rows={recentLedger.map((row) => [
                row.strategy,
                row.side,
                numeric(row.shares).toFixed(2),
                money(row.price, 3),
                money(row.fee_usd, 3),
                money(row.pnl_usd ?? 0),
              ])}
            />
          </main>

          <aside className="right-rail">
            <WalletPanel
              wallet={wallet}
              watchedWallet={watchedWallet}
              onWatchWallet={handleWatchWallet}
              onConnectBrowserWallet={() => void handleConnectBrowserWallet()}
            />
            <ConnectionsPanel connections={connections} />
            <OperationsPanel operations={operations} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "good" | "bad" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function StatusPill({ label, ok, text }: { label: string; ok: boolean; text?: string }) {
  return (
    <span className={`status-pill ${ok ? "ok" : "warn"}`}>
      <span className={`status-dot ${ok ? "ok" : "warn"}`} />
      {label}: {text ?? (ok ? "ok" : "off")}
    </span>
  );
}

function WalletPanel({
  wallet,
  watchedWallet,
  onWatchWallet,
  onConnectBrowserWallet,
}: {
  wallet: WalletSnapshot | null;
  watchedWallet: string | null;
  onWatchWallet: (address: string | null) => void;
  onConnectBrowserWallet: () => void;
}) {
  const [draft, setDraft] = useState(watchedWallet ?? wallet?.address ?? "");

  useEffect(() => {
    setDraft(watchedWallet ?? wallet?.address ?? "");
  }, [watchedWallet, wallet?.address]);

  const pUsd = wallet?.balances.find((balance) => balance.id === "pusd");
  const configured = Boolean(wallet?.configured && wallet.address);

  return (
    <section className="rail-panel wallet-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Wallet</p>
          <h2>Saldo</h2>
        </div>
        <span className={`rail-badge ${configured ? "ok" : "warn"}`}>{configured ? wallet?.source : "off"}</span>
      </div>

      <div className="wallet-total">
        <span>pUSD collateral</span>
        <strong>{tokenAmount(pUsd?.amount ?? 0, 4)}</strong>
        <small>{wallet?.address ? shortId(wallet.address) : "No wallet configured"}</small>
      </div>

      <div className="balance-list">
        {(wallet?.balances ?? []).map((balance) => (
          <div className="balance-row" key={balance.id}>
            <span>{balance.label}</span>
            <strong>{tokenAmount(balance.amount, balance.id === "pol" ? 5 : 4)} {balance.symbol}</strong>
            {!balance.ok && <small>{balance.error}</small>}
          </div>
        ))}
        {!wallet?.balances.length && <EmptyState text="Connect a wallet address." />}
      </div>

      <form
        className="wallet-form"
        onSubmit={(event) => {
          event.preventDefault();
          onWatchWallet(draft);
        }}
      >
        <input
          aria-label="Wallet address"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="0x public wallet"
          value={draft}
        />
        <button type="submit">Watch</button>
      </form>

      <div className="rail-actions">
        <button className="ghost-button slim" onClick={onConnectBrowserWallet} type="button">
          Connect browser wallet
        </button>
        <button className="ghost-button slim" onClick={() => onWatchWallet(null)} type="button">
          Clear
        </button>
      </div>
    </section>
  );
}

function ConnectionsPanel({ connections }: { connections: ConnectionItem[] }) {
  return (
    <section className="rail-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Connections</p>
          <h2>Links</h2>
        </div>
      </div>
      <div className="connection-list">
        {connections.map((connection) => (
          <div className="connection-row" key={connection.id}>
            <span className={`status-dot ${connection.status === "ok" ? "ok" : connection.status === "warn" ? "warn" : "bad"}`} />
            <div>
              <strong>{connection.label}</strong>
              <small>{connection.detail}</small>
            </div>
            {connection.latencyMs != null && <em>{connection.latencyMs}ms</em>}
          </div>
        ))}
        {connections.length === 0 && <EmptyState text="Checking connections." />}
      </div>
    </section>
  );
}

function OperationsPanel({ operations }: { operations: OperationRow[] }) {
  return (
    <section className="rail-panel operations-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Histórico</h2>
        </div>
      </div>
      <div className="operation-list">
        {operations.map((operation, index) => {
          const notional = numeric(operation.shares) * numeric(operation.price);
          const pnl = numeric(operation.pnl_usd ?? 0);
          return (
            <div className="operation-row" key={`${operation.id ?? index}-${operation.created_at ?? ""}`}>
              <div className="operation-line">
                <span className={`side-chip ${operation.side.toLowerCase()}`}>{operation.side}</span>
                <strong>{operation.asset} {operation.window_type}</strong>
                <em>{timeAgo(operation.created_at)}</em>
              </div>
              <div className="operation-meta">
                <span>{operation.strategy}</span>
                <span>{money(notional, 2)}</span>
                <span className={pnl >= 0 ? "positive" : "negative"}>{money(pnl, 2)}</span>
              </div>
            </div>
          );
        })}
        {operations.length === 0 && <EmptyState text="No operations yet." />}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function TablePanel({ title, eyebrow, columns, rows, empty }: { title: string; eyebrow: string; columns: string[]; rows: string[][]; empty: string }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
