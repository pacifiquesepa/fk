-- Migration 027: login and session audit trail
CREATE TABLE IF NOT EXISTS audit_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  login_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  logout_at DATETIME NULL,
  INDEX idx_audit_user_date (user_id, login_at),
  INDEX idx_audit_online (last_seen_at, logout_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
