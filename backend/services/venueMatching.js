// backend/services/venueMatching.js
// Patent candidate: Dwell-time threshold + mutual presence as match trigger
// Matches users physically co-present at same venue for minimum dwell time

const db = require('../db/pool');

const DWELL_THRESHOLD_MINUTES = 5;   // both must be present for 5+ min
const VENUE_RADIUS_METERS = 75;      // geofence radius per venue
const MATCH_COOLDOWN_HOURS = 24;     // don't re-trigger same pair at same venue

// ─── VENUE CHECK-IN ───────────────────────────────────────────
// Called when user location updates — detects venue entry
async function handleLocationUpdate(userId, lat, lng) {
  // Find nearby registered venues
  const { rows: venues } = await db.query(
    `SELECT id, name, category, lat, lng,
       ST_Distance(
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
       ) AS distance_meters
     FROM venues
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
       ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
       $3
     )
     ORDER BY distance_meters ASC
     LIMIT 1`,
    [lat, lng, VENUE_RADIUS_METERS]
  );

  if (!venues.length) {
    // User left all venues — update check-out
    await checkOutUser(userId);
    return null;
  }

  const venue = venues[0];
  await upsertVenuePresence(userId, venue.id, lat, lng);
  return venue;
}

// ─── UPSERT PRESENCE ──────────────────────────────────────────
async function upsertVenuePresence(userId, venueId, lat, lng) {
  await db.query(
    `INSERT INTO venue_presence (user_id, venue_id, arrived_at, last_seen_at, lat, lng)
     VALUES ($1, $2, NOW(), NOW(), $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       venue_id = $2, last_seen_at = NOW(), lat = $3, lng = $4,
       arrived_at = CASE
         WHEN venue_presence.venue_id != $2 THEN NOW()
         ELSE venue_presence.arrived_at
       END`,
    [userId, venueId, lat, lng]
  );
}

async function checkOutUser(userId) {
  await db.query(
    `DELETE FROM venue_presence WHERE user_id = $1`,
    [userId]
  );
}

// ─── DETECT MUTUAL PRESENCE + TRIGGER MATCH ───────────────────
// Core patent algorithm: dwell-time gated mutual presence detection
async function detectVenueMatches(userId) {
  // Get current user's venue presence
  const { rows: presenceRows } = await db.query(
    `SELECT vp.venue_id, vp.arrived_at,
       EXTRACT(EPOCH FROM (NOW() - vp.arrived_at)) / 60 AS dwell_minutes
     FROM venue_presence vp
     WHERE vp.user_id = $1`,
    [userId]
  );

  if (!presenceRows.length) return [];

  const { venue_id, dwell_minutes } = presenceRows[0];

  // Must meet dwell threshold
  if (dwell_minutes < DWELL_THRESHOLD_MINUTES) return [];

  // Find other users at same venue who also meet dwell threshold
  const { rows: coPresent } = await db.query(
    `SELECT vp.user_id, vp.arrived_at,
       EXTRACT(EPOCH FROM (NOW() - vp.arrived_at)) / 60 AS dwell_minutes,
       u.display_name, u.subscription_tier
     FROM venue_presence vp
     JOIN users u ON u.id = vp.user_id
     WHERE vp.venue_id = $1
       AND vp.user_id != $2
       AND u.is_banned = FALSE
       AND EXTRACT(EPOCH FROM (NOW() - vp.arrived_at)) / 60 >= $3`,
    [venue_id, userId, DWELL_THRESHOLD_MINUTES]
  );

  const triggers = [];

  for (const other of coPresent) {
    // Check cooldown — don't re-trigger same pair at same venue
    const { rows: cooldownRows } = await db.query(
      `SELECT id FROM venue_match_triggers
       WHERE venue_id = $1
         AND ((user1_id = $2 AND user2_id = $3) OR (user1_id = $3 AND user2_id = $2))
         AND triggered_at > NOW() - INTERVAL '${MATCH_COOLDOWN_HOURS} hours'`,
      [venue_id, userId, other.user_id]
    );

    if (cooldownRows.length) continue;

    // Check if already matched
    const { rows: matchRows } = await db.query(
      `SELECT id FROM matches
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [userId, other.user_id]
    );

    // Log trigger
    await db.query(
      `INSERT INTO venue_match_triggers (user1_id, user2_id, venue_id, triggered_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, other.user_id, venue_id]
    );

    triggers.push({
      userId: other.user_id,
      displayName: other.display_name,
      venueId: venue_id,
      dwellMinutes: Math.floor(other.dwell_minutes),
      alreadyMatched: matchRows.length > 0,
    });
  }

  return triggers;
}

// ─── GET VENUE PULSE (live user count per venue) ──────────────
async function getVenuePulse(lat, lng, radiusMeters = 500) {
  const { rows } = await db.query(
    `SELECT v.id, v.name, v.category, v.lat, v.lng,
       COUNT(vp.user_id) AS live_count,
       ST_Distance(
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
       ) AS distance_meters
     FROM venues v
     LEFT JOIN venue_presence vp ON vp.venue_id = v.id
       AND vp.last_seen_at > NOW() - INTERVAL '10 minutes'
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
       ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography,
       $3
     )
     GROUP BY v.id
     ORDER BY live_count DESC, distance_meters ASC`,
    [lat, lng, radiusMeters]
  );

  return rows;
}

module.exports = {
  handleLocationUpdate,
  detectVenueMatches,
  getVenuePulse,
  checkOutUser,
};
