// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../middleware/auth');

const { storeContactHashes, setExclusionPreference } = require('../services/socialGraphExclusion');
const { storeEncryptedProfile, mutualReveal } = require('../services/cryptoReveal');
const { recordActivity } = require('../services/circadian');

// ─── GET MY PROFILE ───────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    recordActivity(req.user.id, 'profile_view').catch(console.error);
    const { rows } = await db.query(
      `SELECT u.*,
         json_agg(DISTINCT p.* ORDER BY p.position) FILTER (WHERE p.id IS NOT NULL) AS photos,
         cp.primary_bucket, cp.chronotype_score, cp.peak_hour
       FROM users u
       LEFT JOIN user_photos p ON p.user_id = u.id
       LEFT JOIN circadian_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1 GROUP BY u.id, cp.primary_bucket, cp.chronotype_score, cp.peak_hour`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE PROFILE ───────────────────────────────────────────
router.put('/me', auth, async (req, res) => {
  const { displayName, bio, age, interests, gender, genderPreference, jobTitle, education } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET
         display_name = COALESCE($1, display_name),
         bio = COALESCE($2, bio),
         age = COALESCE($3, age),
         interests = COALESCE($4, interests),
         gender = COALESCE($5, gender),
         gender_preference = COALESCE($6, gender_preference),
         job_title = COALESCE($7, job_title),
         education = COALESCE($8, education),
         updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [displayName, bio, age, interests, gender, genderPreference, jobTitle, education, req.user.id]
    );

    // Re-encrypt profile after update (async)
    storeEncryptedProfile(req.user.id).catch(console.error);

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SYNC CONTACTS (social graph exclusion) ───────────────────
router.post('/contacts/sync', auth, async (req, res) => {
  const { phoneNumbers } = req.body; // array of strings
  if (!Array.isArray(phoneNumbers)) {
    return res.status(400).json({ error: 'phoneNumbers must be an array' });
  }
  try {
    await storeContactHashes(req.user.id, phoneNumbers);
    res.json({ success: true, count: phoneNumbers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXCLUSION PREFERENCE ─────────────────────────────────────
router.put('/settings/exclusion', auth, async (req, res) => {
  const { enabled } = req.body;
  try {
    await setExclusionPreference(req.user.id, enabled);
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MUTUAL REVEAL ────────────────────────────────────────────
router.post('/reveal', auth, async (req, res) => {
  const { targetUserId, myRevealToken, theirRevealToken } = req.body;
  try {
    const profiles = await mutualReveal(
      req.user.id,
      targetUserId,
      myRevealToken,
      theirRevealToken
    );
    res.json(profiles);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── INIT ENCRYPTED PROFILE ───────────────────────────────────
router.post('/encrypt-profile', auth, async (req, res) => {
  try {
    const revealToken = await storeEncryptedProfile(req.user.id);
    // Token returned once — user must save it on device
    res.json({ revealToken, message: 'Store this token securely on your device.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUSH TOKEN ───────────────────────────────────────────────
router.post('/push-token', auth, async (req, res) => {
  const { token } = req.body;
  try {
    await db.query(
      `INSERT INTO push_tokens (user_id, token, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, token) DO NOTHING`,
      [req.user.id, token]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NEARBY USERS (PostGIS) ───────────────────────────────────
router.get('/nearby', auth, async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.display_name, u.age,
         ST_Distance(
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           ST_SetSRID(ST_MakePoint(u.lng, u.lat), 4326)::geography
         ) AS distance_meters
       FROM users u
       WHERE u.id != $3
         AND u.is_banned = FALSE AND u.deleted_at IS NULL
         AND ST_DWithin(
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           ST_SetSRID(ST_MakePoint(u.lng, u.lat), 4326)::geography,
           $4
         )
       ORDER BY distance_meters ASC LIMIT 50`,
      [lat, lng, req.user.id, radius]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
