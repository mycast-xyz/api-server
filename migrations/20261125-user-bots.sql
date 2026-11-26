-- Additive migration. Does not change existing user, bot or chat tables.
CREATE TABLE IF NOT EXISTS user_bot (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  owner_idx INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  icon VARCHAR(1000) NOT NULL DEFAULT '',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX user_bot_owner(owner_idx, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS user_bot_token (
  bot_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  token_cipher TEXT NOT NULL,
  expires_at DATETIME NULL,
  revoked_at DATETIME NULL,
  FOREIGN KEY (bot_id) REFERENCES user_bot(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
