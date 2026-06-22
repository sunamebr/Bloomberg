CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(128) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_time (user_id, created_at),
  CONSTRAINT fk_audit_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS markets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  market_id VARCHAR(128) NOT NULL UNIQUE,
  condition_id VARCHAR(128) NULL,
  question VARCHAR(255) NULL,
  asset VARCHAR(16) NOT NULL DEFAULT 'BTC',
  window_type VARCHAR(16) NOT NULL DEFAULT '5m',
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  starts_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_markets_asset_window_status (asset, window_type, status)
);

CREATE TABLE IF NOT EXISTS signals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy VARCHAR(96) NOT NULL,
  asset VARCHAR(16) NOT NULL,
  window_type VARCHAR(16) NOT NULL,
  market_id VARCHAR(128) NOT NULL,
  token_id VARCHAR(128) NOT NULL,
  side VARCHAR(16) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  size_usd DECIMAL(18, 8) NOT NULL,
  confidence DECIMAL(10, 6) NULL,
  raw JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_signals_time (created_at),
  INDEX idx_signals_strategy_time (strategy, created_at),
  INDEX idx_signals_market (market_id, token_id)
);

CREATE TABLE IF NOT EXISTS positions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  market_id VARCHAR(128) NOT NULL,
  token_id VARCHAR(128) NOT NULL,
  asset VARCHAR(16) NOT NULL,
  window_type VARCHAR(16) NOT NULL,
  side VARCHAR(16) NOT NULL,
  shares DECIMAL(18, 8) NOT NULL,
  avg_price DECIMAL(18, 8) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  INDEX idx_positions_status_time (status, opened_at),
  INDEX idx_positions_market_token (market_id, token_id),
  CONSTRAINT fk_positions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ledger (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  strategy VARCHAR(96) NOT NULL,
  asset VARCHAR(16) NOT NULL,
  window_type VARCHAR(16) NOT NULL,
  market_id VARCHAR(128) NOT NULL,
  token_id VARCHAR(128) NOT NULL,
  side VARCHAR(16) NOT NULL,
  shares DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  fee_usd DECIMAL(18, 8) NOT NULL DEFAULT 0,
  pnl_usd DECIMAL(18, 8) NULL,
  mode VARCHAR(16) NOT NULL DEFAULT 'paper',
  raw JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ledger_time (created_at),
  INDEX idx_ledger_mode_time (mode, created_at),
  INDEX idx_ledger_strategy_time (strategy, created_at),
  CONSTRAINT fk_ledger_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS strategy_state (
  strategy VARCHAR(96) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password_hash, role)
VALUES
  ('mestra', 'operator@mestrados.local', '$2a$10$2xZOWiIU/aLFcTbl8lHrz.Nc0eJfSn7LhqXi1zKGxXRL5DgZIxYke', 'admin')
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  role = VALUES(role),
  is_active = TRUE;

INSERT INTO audit_log (user_id, action, ip_address, details)
SELECT id, 'schema_bootstrap', '127.0.0.1', JSON_OBJECT('mode', 'paper', 'seed_user', 'mestra')
FROM users
WHERE username = 'mestra';
