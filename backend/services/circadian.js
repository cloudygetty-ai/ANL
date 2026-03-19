// backend/services/circadian.js
// Patent candidate: Passive behavioral inference for compatibility matching
// Derives activity time patterns from app usage — not self-reported

const db = require('../db/pool');

// ─── TIME BUCKETS ─────────────────────────────────────────────
// Divide 24hrs into 6 behavioral windows
const TIME_BUCKETS = {
  early_bird:   { start: 5,  end: 9,  label: 'Early Bird' },
  morning:      { start: 9,  end: 12, label: 'Morning' },
  afternoon:    { start: 12, end: 17, label: 'Afternoon' },
  evening:      { start: 17, end: 21, label: 'Evening' },
  night_owl:    { start: 21, end: 24, label: 'Night Owl' },
  late_night:   { start: 0,  end: 5,  label: 'Late Night' },
};

// ─── RECORD ACTIVITY EVENT ────────────────────────────────────
async function recordActivity(userId, eventType = 'app_open') {
  const hour = new Date().getHours();
  await db.query(
    `INSERT INTO user_activity_log (user_id, event_type, hour_of_day, day_of_week, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId, eventType, hour, new Date().getDay()]
  );
}

// ─── COMPUTE CIRCADIAN PROFILE ────────────────────────────────
// Returns weighted distribution of activity across time buckets
async function computeCircadianProfile(userId, days = 30) {
  const { rows } = await db.query(
    `SELECT hour_of_day, COUNT(*) as count
     FROM user_activity_log
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY hour_of_day
     ORDER BY hour_of_day`,
    [userId]
  );

  if (rows.length < 10) return null; // insufficient data

  // Build hour distribution
  const hourDist = Array(24).fill(0);
  let total = 0;
  for (const row of rows) {
    hourDist[row.hour_of_day] += parseInt(row.count);
    total += parseInt(row.count);
  }

  // Normalize to percentages
  const normalized = hourDist.map((c) => (total > 0 ? c / total : 0));

  // Compute bucket weights
  const bucketWeights = {};
  for (const [key, bucket] of Object.entries(TIME_BUCKETS)) {
    const hours = bucket.end > bucket.start
      ? Array.from({ length: bucket.end - bucket.start }, (_, i) => bucket.start + i)
      : [...Array.from({ length: 24 - bucket.start }, (_, i) => bucket.start + i),
         ...Array.from({ length: bucket.end }, (_, i) => i)];

    bucketWeights[key] = hours.reduce((sum, h) => sum + normalized[h], 0);
  }

  // Peak activity window
  const peakHour = hourDist.indexOf(Math.max(...hourDist));
  const primaryBucket = Object.entries(bucketWeights)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Chronotype score: 0 = extreme early bird, 1 = extreme night owl
  const chronotypeScore = normalized.reduce((sum, val, hour) => sum + val * hour, 0) / 23;

  return {
    userId,
    bucketWeights,
    primaryBucket,
    peakHour,
    chronotypeScore,
    dataPoints: total,
    computedAt: new Date().toISOString(),
  };
}

// ─── CIRCADIAN COMPATIBILITY SCORE ───────────────────────────
// Core patent-worthy algorithm: compares two behavioral profiles
// Returns 0–1 compatibility score based on temporal overlap
async function computeCircadianCompatibility(userId1, userId2) {
  const [profile1, profile2] = await Promise.all([
    computeCircadianProfile(userId1),
    computeCircadianProfile(userId2),
  ]);

  // Fallback if insufficient data
  if (!profile1 || !profile2) {
    return { score: 0.5, confidence: 'low', reason: 'insufficient_data' };
  }

  // Cosine similarity between bucket weight vectors
  const keys = Object.keys(TIME_BUCKETS);
  const vec1 = keys.map((k) => profile1.bucketWeights[k]);
  const vec2 = keys.map((k) => profile2.bucketWeights[k]);

  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  const cosineSim = mag1 && mag2 ? dot / (mag1 * mag2) : 0;

  // Chronotype proximity bonus (similar sleep schedules)
  const chronotypeDiff = Math.abs(profile1.chronotypeScore - profile2.chronotypeScore);
  const chronotypeBonus = Math.max(0, 0.2 * (1 - chronotypeDiff * 2));

  const rawScore = Math.min(1, cosineSim + chronotypeBonus);

  // Compatibility label
  let label, reason;
  if (rawScore >= 0.8) {
    label = 'perfect';
    reason = `Both ${TIME_BUCKETS[profile1.primaryBucket].label}s — you keep the same hours`;
  } else if (rawScore >= 0.6) {
    label = 'good';
    reason = 'Similar schedules with some overlap';
  } else if (rawScore >= 0.4) {
    label = 'moderate';
    reason = 'Different rhythms — could work with effort';
  } else {
    label = 'challenging';
    reason = 'Opposite schedules — timing will be a challenge';
  }

  return {
    score: parseFloat(rawScore.toFixed(3)),
    confidence: profile1.dataPoints > 50 && profile2.dataPoints > 50 ? 'high' : 'medium',
    label,
    reason,
    profile1: { primaryBucket: profile1.primaryBucket, peakHour: profile1.peakHour },
    profile2: { primaryBucket: profile2.primaryBucket, peakHour: profile2.peakHour },
  };
}

// ─── CACHE PROFILE TO DB ──────────────────────────────────────
async function cacheCircadianProfile(userId) {
  const profile = await computeCircadianProfile(userId);
  if (!profile) return;

  await db.query(
    `INSERT INTO circadian_profiles (user_id, bucket_weights, primary_bucket,
     peak_hour, chronotype_score, data_points, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       bucket_weights = $2, primary_bucket = $3, peak_hour = $4,
       chronotype_score = $5, data_points = $6, computed_at = NOW()`,
    [
      userId,
      JSON.stringify(profile.bucketWeights),
      profile.primaryBucket,
      profile.peakHour,
      profile.chronotypeScore,
      profile.dataPoints,
    ]
  );

  return profile;
}

module.exports = {
  recordActivity,
  computeCircadianProfile,
  computeCircadianCompatibility,
  cacheCircadianProfile,
};
