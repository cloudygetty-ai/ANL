-- backend/db/migrations/005_patent_features.sql
-- Migrations for all 5 patentable features

-- ─── CIRCADIAN SCORING ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL DEFAULT 'app_open',
  hour_of_day  SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON user_activity_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS circadian_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bucket_weights  JSONB NOT NULL,
  primary_bucket  TEXT NOT NULL,
  peak_hour       SMALLINT NOT NULL,
  chronotype_score FLOAT NOT NULL,
  data_points     INTEGER NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VENUE MATCHING ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  category  TEXT,
  lat       FLOAT NOT NULL,
  lng       FLOAT NOT NULL,
  address   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT AddGeometryColumn('venues', 'geom', 4326, 'POINT', 2);
CREATE INDEX IF NOT EXISTS idx_venues_geom ON venues USING GIST(geom);

CREATE TABLE IF NOT EXISTS venue_presence (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  arrived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat        FLOAT,
  lng        FLOAT
);
CREATE INDEX IF NOT EXISTS idx_venue_presence_venue ON venue_presence(venue_id);

CREATE TABLE IF NOT EXISTS venue_match_triggers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_venue_triggers_pair ON venue_match_triggers(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_venue_triggers_venue ON venue_match_triggers(venue_id, triggered_at DESC);

-- ─── VOICE TONE ANALYSIS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_audio_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id          TEXT NOT NULL,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pitch_mean       FLOAT,
  pitch_variance   FLOAT,
  speaking_rate    FLOAT,
  pause_frequency  FLOAT,
  volume_rms       FLOAT,
  laugh_detected   BOOLEAN NOT NULL DEFAULT FALSE,
  overlap_detected BOOLEAN NOT NULL DEFAULT FALSE,
  captured_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audio_snapshots_call ON call_audio_snapshots(call_id, captured_at DESC);

ALTER TABLE call_history
  ADD COLUMN IF NOT EXISTS chemistry_score FLOAT,
  ADD COLUMN IF NOT EXISTS chemistry_label TEXT;

-- ─── CRYPTOGRAPHIC REVEAL ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS encrypted_profiles (
  user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  encrypted_data         TEXT NOT NULL,
  iv                     TEXT NOT NULL,
  auth_tag               TEXT NOT NULL,
  server_key_half        TEXT NOT NULL,
  client_key_half_xored  TEXT NOT NULL,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reveal_events (
  user1_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user1_id, user2_id)
);

-- ─── SOCIAL GRAPH EXCLUSION ───────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_hashes (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hash    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_hashes_user ON contact_hashes(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_hashes_hash ON contact_hashes(hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_hashes_unique ON contact_hashes(user_id, hash);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS social_exclusion_enabled BOOLEAN NOT NULL DEFAULT TRUE;
