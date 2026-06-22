import { useEffect, useState } from "react";

interface HeaderProps {
  onLogout: () => void;
  username: string;
  paperMode: boolean;
  dbOk: boolean;
  wsConnected: boolean;
  marketLabel: string;
  fills: number;
}

export default function Header({ onLogout, username, paperMode, dbOk, wsConnected, marketLabel, fills }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const utc = time.toISOString().replace("T", " ").slice(0, 19);

  return (
    <header className="topbar">
      <div className="brand-mark">MDT</div>
      <div className="brand-copy">
        <strong>MestraDosTrades</strong>
        <span>
          USER {username.toUpperCase()} / {marketLabel} / {fills.toLocaleString("en-US")} FILLS
        </span>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-status">
        <span className={`header-chip ${paperMode ? "paper" : "live"}`}>{paperMode ? "PAPER" : "LIVE"}</span>
        <span className={`header-chip ${dbOk ? "ok" : "warn"}`}>DB {dbOk ? "OK" : "OFF"}</span>
        <span className={`header-chip ${wsConnected ? "ok" : "warn"}`}>WS {wsConnected ? "ON" : "WAIT"}</span>
      </div>

      <span className="clock">{utc} UTC</span>
      <button className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
}
