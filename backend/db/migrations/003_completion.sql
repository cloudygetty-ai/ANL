-- ANL — DB migrations for Stripe, S3, WebRTC modules
-- Run: psql -d anl -f migrations/003_completion.sql

-- ─── STRIPE COLUMNS ────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_tier      TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'plus', 'premium')),
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'pending', 'past_due', 'cancelling')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_expires_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- ─── USER PHOTOS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  s3_key      TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 0,
  approved    BOOLEAN DEFAULT NULL,  -- NULL = pending, TRUE = approved, FALSE = rejected
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_primary ON user_photos(user_id, is_primary) WHERE is_primary = TRUE;

-- ─── MODERATION QUEUE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'flagged', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status);

-- ─── CALL HISTORY TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id      TEXT NOT NULL UNIQUE,
  caller_id    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  callee_id    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  call_type    TEXT NOT NULL DEFAULT 'video' CHECK (call_type IN ('video', 'audio')),
  status       TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'missed', 'rejected', 'failed')),
  duration_sec INTEGER DEFAULT 0,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_callee ON call_history(callee_id);

-- ─── FEATURE GATE HELPER FUNCTION ─────────────────────────────
CREATE OR REPLACE FUNCTION user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  tier TEXT;
BEGIN
  SELECT subscription_tier INTO tier FROM users WHERE id = p_user_id;
  RETURN CASE p_feature
    WHEN 'unlimited_swipes'    THEN tier IN ('plus', 'premium')
    WHEN 'see_who_likes_you'   THEN tier IN ('plus', 'premium')
    WHEN 'rewind'              THEN tier IN ('plus', 'premium')
    WHEN 'profile_boost'       THEN tier IN ('plus', 'premium')
    WHEN 'ai_coach'            THEN tier = 'premium'
    WHEN 'incognito'           THEN tier = 'premium'
    WHEN 'priority_matching'   THEN tier = 'premium'
    WHEN 'video_messages'      THEN tier = 'premium'
    WHEN 'read_receipts'       THEN tier = 'premium'
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql STABLE;
