// backend/routes/discovery.js
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../middleware/auth');

// Patent services
const { recordActivity, computeCircadianCompatibility, cacheCircadianProfile } = require('../services/circadian');
const { handleLocationUpdate, detectVenueMatches, getVenuePulse } = require('../services/venueMatching');
const { filterDiscoveryPool } = require('../services/socialGraphExclusion');
const { getBlurredPreview } = require('../services/cryptoReveal');

// ─── GET DISCOVERY FEED ───────────────────────────────────────
router.get('/feed', auth, async (req, res) => {
  const { lat, lng, limit = 20 } = req.query;
  const userId = req.user.id;

  try {
    // Record activity for circadian profiling
    recordActivity(userId, 'discovery_open').catch(console.error);

    // Base query — nearby users not yet swiped
    const { rows: candidates } = await db.query(
      `SELECT u.id, u.display_name, u.age, u.bio, u.interests,
              u.subscription_tier, u.last_active, u.boost_expires_at,
              ST_Distance(
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                ST_SetSRID(ST_MakePoint(u.lng, u.lat), 4326)::geography
              ) AS distance_meters,
              cp.primary_bucket, cp.chronotype_score,
              vp.venue_id AS currently_at_venue
       FROM users u
       LEFT JOIN circadian_profiles cp ON cp.user_id = u.id
       LEFT JOIN venue_presence vp ON vp.user_id = u.id
       WHERE u.id != $3
         AND u.is_banned = FALSE
         AND u.deleted_at IS NULL
         AND u.last_active > NOW() - INTERVAL '7 days'
         AND NOT EXISTS (
           SELECT 1 FROM swipes
           WHERE swiper_id = $3 AND swipee_id = u.id
         )
         AND ($1::float IS NULL OR ST_DWithin(
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           ST_SetSRID(ST_MakePoint(u.lng, u.lat), 4326)::geography,
           50000
         ))
       ORDER BY
         CASE WHEN u.boost_expires_at > NOW() THEN 0 ELSE 1 END,
         CASE WHEN vp.venue_id IS NOT NULL THEN 0 ELSE 1 END,
         distance_meters ASC NULLS LAST
       LIMIT $4`,
      [lat || null, lng || null, userId, parseInt(limit) * 2] // fetch 2x for filtering
    );

    const candidateIds = candidates.map((c) => c.id);

    // ─── Social graph exclusion filter ───────────────────────
    const { rows: prefRows } = await db.query(
      `SELECT social_exclusion_enabled FROM users WHERE id = $1`,
      [userId]
    );
    let filteredIds = candidateIds;
    if (prefRows[0]?.social_exclusion_enabled !== false) {
      filteredIds = await filterDiscoveryPool(userId, candidateIds);
    }

    // Filter candidates to non-excluded
    const filteredCandidates = candidates
      .filter((c) => filteredIds.includes(c.id))
      .slice(0, parseInt(limit));

    // ─── Enrich with circadian compatibility ─────────────────
    const enriched = await Promise.all(
      filteredCandidates.map(async (candidate) => {
        let circadianScore = null;
        try {
          circadianScore = await computeCircadianCompatibility(userId, candidate.id);
        } catch { /* non-blocking */ }

        // Get blurred preview for crypto reveal
        const preview = await getBlurredPreview(candidate.id).catch(() => null);

        return {
          ...candidate,
          distance_km: candidate.distance_meters
            ? parseFloat((candidate.distance_meters / 1000).toFixed(1))
            : null,
          circadian: circadianScore ? {
            score: circadianScore.score,
            label: circadianScore.label,
            reason: circadianScore.reason,
          } : null,
          isAtVenue: !!candidate.currently_at_venue,
          cryptoPreview: preview,
        };
      })
    );

    // Sort: venue present → circadian match → distance
    enriched.sort((a, b) => {
      if (a.isAtVenue !== b.isAtVenue) return a.isAtVenue ? -1 : 1;
      const aCirc = a.circadian?.score ?? 0.5;
      const bCirc = b.circadian?.score ?? 0.5;
      if (Math.abs(aCirc - bCirc) > 0.1) return bCirc - aCirc;
      return (a.distance_km ?? 999) - (b.distance_km ?? 999);
    });

    res.json({ users: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SWIPE ────────────────────────────────────────────────────
router.post('/swipe', auth, async (req, res) => {
  const { targetUserId, direction } = req.body; // direction: 'left' | 'right' | 'super'
  const userId = req.user.id;

  try {
    recordActivity(userId, 'swipe').catch(console.error);

    // Check swipe limits for free users
    const { rows: userRows } = await db.query(
      `SELECT subscription_tier FROM users WHERE id = $1`, [userId]
    );
    if (userRows[0]?.subscription_tier === 'free') {
      const { rows: swipeCount } = await db.query(
        `SELECT COUNT(*) AS count FROM swipes
         WHERE swiper_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [userId]
      );
      if (parseInt(swipeCount[0].count) >= 10) {
        return res.status(402).json({ error: 'swipe_limit_reached', tier: 'free' });
      }
    }

    // Record swipe
    await db.query(
      `INSERT INTO swipes (swiper_id, swipee_id, direction, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (swiper_id, swipee_id) DO UPDATE SET direction = $3`,
      [userId, targetUserId, direction]
    );

    let match = null;

    if (direction === 'right' || direction === 'super') {
      // Check for mutual like
      const { rows: mutualRows } = await db.query(
        `SELECT id FROM swipes
         WHERE swiper_id = $1 AND swipee_id = $2
           AND direction IN ('right', 'super')`,
        [targetUserId, userId]
      );

      if (mutualRows.length) {
        // Create match
        const { rows: matchRows } = await db.query(
          `INSERT INTO matches (user1_id, user2_id, is_active, created_at)
           VALUES ($1, $2, TRUE, NOW())
           ON CONFLICT (user1_id, user2_id) DO NOTHING
           RETURNING id`,
          [...[userId, targetUserId].sort()]
        );

        if (matchRows[0]) {
          match = { matchId: matchRows[0].id, isNew: true };
        }
      }
    }

    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LOCATION UPDATE + VENUE DETECTION ───────────────────────
router.post('/location', auth, async (req, res) => {
  const { lat, lng } = req.body;
  const userId = req.user.id;

  try {
    // Update user location
    await db.query(
      `UPDATE users SET lat = $1, lng = $2, location_updated_at = NOW() WHERE id = $3`,
      [lat, lng, userId]
    );

    // Venue detection
    const venue = await handleLocationUpdate(userId, lat, lng);

    // Check for venue-triggered matches (async, emit via socket)
    if (venue) {
      detectVenueMatches(userId).then((triggers) => {
        if (triggers.length) {
          // Emit via socket — handled in socket/index.js
          req.app.get('io')?.emit(`venue:matches:${userId}`, triggers);
        }
      }).catch(console.error);
    }

    // Cache circadian profile periodically
    const rand = Math.random();
    if (rand < 0.05) { // 5% chance on each location update
      cacheCircadianProfile(userId).catch(console.error);
    }

    res.json({ success: true, venue: venue ? { id: venue.id, name: venue.name } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VENUE PULSE (NightPulse heatmap data) ────────────────────
router.get('/venue-pulse', auth, async (req, res) => {
  const { lat, lng, radius = 500 } = req.query;
  try {
    recordActivity(req.user.id, 'map_open').catch(console.error);
    const pulse = await getVenuePulse(parseFloat(lat), parseFloat(lng), parseFloat(radius));
    res.json(pulse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CIRCADIAN PROFILE ────────────────────────────────────────
router.get('/circadian', auth, async (req, res) => {
  try {
    const { computeCircadianProfile } = require('../services/circadian');
    const profile = await computeCircadianProfile(req.user.id);
    res.json(profile ?? { error: 'insufficient_data' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
