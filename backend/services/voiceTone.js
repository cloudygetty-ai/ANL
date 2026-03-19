// backend/services/voiceTone.js
// Patent candidate: Acoustic feature extraction applied to romantic compatibility scoring
// Analyzes vocal patterns during calls to generate real-time chemistry score

const db = require('../db/pool');

// ─── FEATURE EXTRACTION ───────────────────────────────────────
// Client sends audio feature snapshots every 5s during call
// Features extracted client-side via Web Audio API / expo-av
// to avoid sending raw audio to server (privacy + bandwidth)

const SNAPSHOT_INTERVAL_MS = 5000;
const MIN_SNAPSHOTS_FOR_SCORE = 6; // 30 seconds minimum

// Feature weights for chemistry scoring
const FEATURE_WEIGHTS = {
  pitchVariance:      0.20, // vocal expressiveness
  speakingRate:       0.15, // energy / engagement
  pauseFrequency:     0.15, // comfort / natural flow
  volumeConsistency:  0.10, // confidence
  laughDetected:      0.25, // strongest positive signal
  overlapRate:        0.15, // mutual engagement (talking over each other)
};

// ─── INGEST AUDIO SNAPSHOT ────────────────────────────────────
async function ingestSnapshot(callId, userId, features) {
  const {
    pitchMean,
    pitchVariance,
    speakingRate,       // syllables per second estimate
    pauseFrequency,     // pauses per minute
    volumeRms,
    laughDetected,
    overlapDetected,
    timestamp,
  } = features;

  await db.query(
    `INSERT INTO call_audio_snapshots
     (call_id, user_id, pitch_mean, pitch_variance, speaking_rate,
      pause_frequency, volume_rms, laugh_detected, overlap_detected, captured_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [callId, userId, pitchMean, pitchVariance, speakingRate,
     pauseFrequency, volumeRms, laughDetected, overlapDetected,
     new Date(timestamp)]
  );
}

// ─── COMPUTE REAL-TIME CHEMISTRY SCORE ────────────────────────
// Core patent algorithm: multi-feature acoustic compatibility scoring
async function computeChemistryScore(callId) {
  const { rows } = await db.query(
    `SELECT user_id,
       AVG(pitch_variance)    AS avg_pitch_variance,
       AVG(speaking_rate)     AS avg_speaking_rate,
       AVG(pause_frequency)   AS avg_pause_frequency,
       AVG(volume_rms)        AS avg_volume_rms,
       AVG(laugh_detected::int) AS laugh_rate,
       AVG(overlap_detected::int) AS overlap_rate,
       COUNT(*) AS snapshot_count
     FROM call_audio_snapshots
     WHERE call_id = $1
       AND captured_at > NOW() - INTERVAL '2 minutes'
     GROUP BY user_id`,
    [callId]
  );

  if (rows.length < 2) return null;

  const [u1, u2] = rows;
  if (u1.snapshot_count < MIN_SNAPSHOTS_FOR_SCORE ||
      u2.snapshot_count < MIN_SNAPSHOTS_FOR_SCORE) return null;

  // ─── Score each feature ──────────────────────────────────────

  // Pitch variance: both should be expressive (high variance = engaged)
  const pitchEngagement = Math.min(
    normalizeToScore(u1.avg_pitch_variance, 20, 80),
    normalizeToScore(u2.avg_pitch_variance, 20, 80)
  );

  // Speaking rate similarity: matched pace = comfort
  const ratesDiff = Math.abs(u1.avg_speaking_rate - u2.avg_speaking_rate);
  const speakingRateScore = Math.max(0, 1 - ratesDiff / 3);

  // Pause frequency: natural pauses = comfort, too many = awkward
  const avgPauses = (parseFloat(u1.avg_pause_frequency) + parseFloat(u2.avg_pause_frequency)) / 2;
  const pauseScore = normalizeToScore(avgPauses, 5, 20);

  // Volume consistency: both speaking at similar volumes = balance
  const volDiff = Math.abs(u1.avg_volume_rms - u2.avg_volume_rms);
  const volumeScore = Math.max(0, 1 - volDiff / 0.3);

  // Laugh rate: strongest signal
  const laughScore = Math.min(1,
    (parseFloat(u1.laugh_rate) + parseFloat(u2.laugh_rate)) * 3
  );

  // Overlap rate: light overlap = enthusiasm, heavy = not listening
  const avgOverlap = (parseFloat(u1.overlap_rate) + parseFloat(u2.overlap_rate)) / 2;
  const overlapScore = normalizeToScore(avgOverlap, 0.05, 0.25);

  // Weighted chemistry score
  const chemistryScore =
    pitchEngagement   * FEATURE_WEIGHTS.pitchVariance +
    speakingRateScore * FEATURE_WEIGHTS.speakingRate +
    pauseScore        * FEATURE_WEIGHTS.pauseFrequency +
    volumeScore       * FEATURE_WEIGHTS.volumeConsistency +
    laughScore        * FEATURE_WEIGHTS.laughDetected +
    overlapScore      * FEATURE_WEIGHTS.overlapRate;

  const score = parseFloat(Math.min(1, chemistryScore).toFixed(3));

  // Label
  const label =
    score >= 0.8 ? '🔥 Strong chemistry' :
    score >= 0.6 ? '✨ Good connection' :
    score >= 0.4 ? '💬 Warming up' :
    '🤔 Still feeling it out';

  // Primary driver
  const drivers = [
    { feature: 'laughter', score: laughScore },
    { feature: 'matched pace', score: speakingRateScore },
    { feature: 'expressiveness', score: pitchEngagement },
    { feature: 'natural pauses', score: pauseScore },
  ].sort((a, b) => b.score - a.score);

  return {
    callId,
    score,
    label,
    primaryDriver: drivers[0].feature,
    breakdown: { pitchEngagement, speakingRateScore, pauseScore, volumeScore, laughScore, overlapScore },
    snapshotCount: Math.min(u1.snapshot_count, u2.snapshot_count),
  };
}

// ─── FINAL CALL CHEMISTRY REPORT ──────────────────────────────
async function generateCallReport(callId) {
  const { rows } = await db.query(
    `SELECT user_id,
       AVG(pitch_variance) AS avg_pitch_variance,
       AVG(speaking_rate)  AS avg_speaking_rate,
       SUM(laugh_detected::int) AS total_laughs,
       COUNT(*) AS total_snapshots,
       MIN(captured_at) AS call_start,
       MAX(captured_at) AS call_end
     FROM call_audio_snapshots
     WHERE call_id = $1
     GROUP BY user_id`,
    [callId]
  );

  if (rows.length < 2) return null;

  const score = await computeChemistryScore(callId);
  const durationMin = rows[0]
    ? Math.round((new Date(rows[0].call_end) - new Date(rows[0].call_start)) / 60000)
    : 0;

  // Store report
  if (score) {
    await db.query(
      `UPDATE call_history SET chemistry_score = $1, chemistry_label = $2
       WHERE call_id = $3`,
      [score.score, score.label, callId]
    );
  }

  return { ...score, durationMin, totalLaughs: rows.reduce((s, r) => s + parseInt(r.total_laughs || 0), 0) };
}

// ─── HELPERS ──────────────────────────────────────────────────
function normalizeToScore(value, min, max) {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

module.exports = { ingestSnapshot, computeChemistryScore, generateCallReport };
