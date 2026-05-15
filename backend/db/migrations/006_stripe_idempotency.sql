-- 006_stripe_idempotency.sql
-- Prevents double-processing of Stripe webhook events

CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-prune events older than 30 days (Stripe retry window is ~3 days)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events (processed_at);
