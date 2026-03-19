// backend/services/socialGraphExclusion.js
// Patent candidate: Multi-signal social proximity detection for exclusion matching
// Detects and excludes users connected to your real-world social network

const db = require('../db/pool');
const crypto = require('crypto');

// ─── SIGNAL WEIGHTS ───────────────────────────────────────────
const EXCLUSION_SIGNALS = {
  contact_match:        { weight: 1.0, label: 'Phone contact' },
  location_overlap:     { weight: 0.7, label: 'Frequents same places' },
  venue_co_presence:    { weight: 0.6, label: 'Met in person' },
  mutual_match_network: { weight: 0.5, label: 'Mutual connection' },
  social_link:          { weight: 0.9, label: 'Social media connection' },
};

const EXCLUSION_THRESHOLD = 0.65; // score above this → excluded

// ─── HASH PHONE CONTACTS ─────────────────────────────────────
// Privacy-preserving: store SHA-256 hashes, not raw numbers
function hashContact(phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function storeContactHashes(userId, phoneNumbers) {
  const hashes = phoneNumbers.map(hashContact);

  await db.query(`DELETE FROM contact_hashes WHERE user_id = $1`, [userId]);

  if (!hashes.length) return;

  const values = hashes.map((h, i) => `($1, $${i + 2})`).join(', ');
  await db.query(
    `INSERT INTO contact_hashes (user_id, hash) VALUES ${values}`,
    [userId, ...hashes]
  );
}

// ─── CONTACT MATCH DETECTION ─────────────────────────────────
async function findContactMatches(userId) {
  // Users whose phone hash appears in this user's contacts
  const { rows } = await db.query(
    `SELECT DISTINCT u.id AS matched_user_id
     FROM contact_hashes ch1
     JOIN contact_hashes ch2 ON ch1.hash = ch2.hash
     JOIN users u ON u.id = ch2.user_id
     WHERE ch1.user_id = $1 AND ch2.user_id != $1`,
    [userId]
  );
  return rows.map((r) => r.matched_user_id);
}

// ─── LOCATION HISTORY OVERLAP ─────────────────────────────────
// Users who frequently visit the same venues
async function findLocationOverlap(userId, minSharedVenues = 2) {
  const { rows } = await db.query(
    `SELECT other_user_id, COUNT(*) AS shared_venues
     FROM (
       SELECT DISTINCT vmt2.user_id AS other_user_id, vmt1.venue_id
       FROM venue_match_triggers vmt1
       JOIN venue_match_triggers vmt2 ON vmt1.venue_id = vmt2.venue_id
         AND vmt2.user_id != vmt1.user_id
       WHERE vmt1.user_id = $1
         AND vmt1.triggered_at > NOW() - INTERVAL '30 days'
         AND vmt2.triggered_at > NOW() - INTERVAL '30 days'
     ) sub
     WHERE other_user_id != $1
     GROUP BY other_user_id
     HAVING COUNT(*) >= $2`,
    [userId, minSharedVenues]
  );
  return rows.map((r) => ({ userId: r.other_user_id, sharedVenues: parseInt(r.shared_venues) }));
}

// ─── MUTUAL MATCH NETWORK ─────────────────────────────────────
// Users who are matches-of-matches (2nd degree)
async function findMutualMatchNetwork(userId) {
  const { rows } = await db.query(
    `SELECT DISTINCT m2.user2_id AS connected_user
     FROM matches m1
     JOIN matches m2 ON (m2.user1_id = m1.user2_id OR m2.user2_id = m1.user1_id)
     WHERE (m1.user1_id = $1 OR m1.user2_id = $1)
       AND m2.user1_id != $1 AND m2.user2_id != $1
     LIMIT 500`,
    [userId]
  );
  return rows.map((r) => r.connected_user);
}

// ─── COMPUTE EXCLUSION SCORE ──────────────────────────────────
// Core patent algorithm: multi-signal social proximity scoring
async function computeExclusionScore(userId, candidateId) {
  let totalScore = 0;
  const signals = [];

  // Signal 1: Contact match
  const contactMatches = await findContactMatches(userId);
  if (contactMatches.includes(candidateId)) {
    totalScore += EXCLUSION_SIGNALS.contact_match.weight;
    signals.push('contact_match');
  }

  // Signal 2: Location overlap
  const locationOverlaps = await findLocationOverlap(userId);
  const overlap = locationOverlaps.find((o) => o.userId === candidateId);
  if (overlap) {
    const weight = Math.min(
      EXCLUSION_SIGNALS.location_overlap.weight,
      EXCLUSION_SIGNALS.location_overlap.weight * (overlap.sharedVenues / 5)
    );
    totalScore += weight;
    signals.push('location_overlap');
  }

  // Signal 3: Venue co-presence (physically met before)
  const { rows: coPresenceRows } = await db.query(
    `SELECT COUNT(*) AS count FROM venue_match_triggers
     WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
       AND triggered_at > NOW() - INTERVAL '90 days'`,
    [userId, candidateId]
  );
  if (parseInt(coPresenceRows[0]?.count) > 0) {
    totalScore += EXCLUSION_SIGNALS.venue_co_presence.weight;
    signals.push('venue_co_presence');
  }

  // Signal 4: Mutual match network
  const mutualNetwork = await findMutualMatchNetwork(userId);
  if (mutualNetwork.includes(candidateId)) {
    totalScore += EXCLUSION_SIGNALS.mutual_match_network.weight;
    signals.push('mutual_match_network');
  }

  const score = Math.min(1, totalScore);
  const excluded = score >= EXCLUSION_THRESHOLD;

  return { candidateId, score, excluded, signals };
}

// ─── FILTER DISCOVERY POOL ────────────────────────────────────
// Batch exclude users from discovery based on social proximity
async function filterDiscoveryPool(userId, candidateIds) {
  if (!candidateIds.length) return [];

  // Fast path: check contact matches in bulk
  const contactMatches = new Set(await findContactMatches(userId));
  const locationOverlaps = new Set(
    (await findLocationOverlap(userId)).map((o) => o.userId)
  );
  const mutualNetwork = new Set(await findMutualMatchNetwork(userId));

  const results = candidateIds.map((candidateId) => {
    let score = 0;
    const signals = [];

    if (contactMatches.has(candidateId)) {
      score += EXCLUSION_SIGNALS.contact_match.weight;
      signals.push('contact_match');
    }
    if (locationOverlaps.has(candidateId)) {
      score += EXCLUSION_SIGNALS.location_overlap.weight;
      signals.push('location_overlap');
    }
    if (mutualNetwork.has(candidateId)) {
      score += EXCLUSION_SIGNALS.mutual_match_network.weight;
      signals.push('mutual_match_network');
    }

    return {
      candidateId,
      score: Math.min(1, score),
      excluded: Math.min(1, score) >= EXCLUSION_THRESHOLD,
      signals,
    };
  });

  return results.filter((r) => !r.excluded).map((r) => r.candidateId);
}

// ─── USER PREFERENCE: DISABLE EXCLUSION ───────────────────────
async function setExclusionPreference(userId, enabled) {
  await db.query(
    `UPDATE users SET social_exclusion_enabled = $1 WHERE id = $2`,
    [enabled, userId]
  );
}

module.exports = {
  storeContactHashes,
  hashContact,
  computeExclusionScore,
  filterDiscoveryPool,
  setExclusionPreference,
};
