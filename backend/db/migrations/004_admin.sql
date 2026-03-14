-- backend/db/migrations/004_admin.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason   TEXT,
  ADD COLUMN IF NOT EXISTS banned_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by    UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_admin  ON users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned) WHERE is_banned = TRUE;

-- User reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  details          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by      UUID REFERENCES users(id),
  resolved_at      TIMESTAMPTZ,
  resolution       TEXT CHECK (resolution IN ('dismiss', 'warn', 'ban')),
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status   ON user_reports(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_reports_unique
  ON user_reports(reporter_id, reported_id)
  WHERE status = 'pending';

-- Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- Promote first user to admin (run once manually)
-- UPDATE users SET is_admin = TRUE WHERE email = 'your@email.com';
