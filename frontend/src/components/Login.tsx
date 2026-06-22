import { useState, type FormEvent } from "react";
import { login } from "../services/api";

interface LoginProps {
  onLogin: () => void | Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      await onLogin();
    } else {
      setError(result.error || "invalid_credentials");
      setIsLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={(event) => void handleLogin(event)}>
        <div className="login-brand">
          <div className="brand-mark large">MDT</div>
          <strong>MestraDosTrades</strong>
          <span>Authorized trading cockpit</span>
        </div>

        <label>
          <span>Username</span>
          <input
            autoComplete="username"
            disabled={isLoading}
            onChange={(event) => setUsername(event.target.value)}
            type="text"
            value={username}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            autoComplete="current-password"
            disabled={isLoading}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="login-button" disabled={isLoading} type="submit">
          {isLoading ? "Authenticating" : "Access terminal"}
        </button>

        <p className="login-footnote">Paper mode is the default. Live mode requires explicit confirmation.</p>
      </form>
    </div>
  );
}
