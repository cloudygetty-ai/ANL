// backend/services/moderation.js
const axios = require('axios');
const db = require('../db/pool');

// ─── PROVIDER CONFIG ──────────────────────────────────────────
// Priority: Sightengine (fast, cheap) → AWS Rekognition (fallback)
// Set MODERATION_PROVIDER=sightengine|rekognition|both|log
const PROVIDER = process.env.MODERATION_PROVIDER || 'log';

// ─── SIGHTENGINE ──────────────────────────────────────────────
async function moderateViaSightengine(imageUrl) {
  const { data } = await axios.get('https://api.sightengine.com/1.0/check.json', {
    params: {
      url: imageUrl,
      models: 'nudity-2.0,weapon,alcohol,drug,gore,face-attributes',
      api_user: process.env.SIGHTENGINE_USER,
      api_secret: process.env.SIGHTENGINE_SECRET,
    },
  });

  const nudity = data.nudity?.sexual_activity > 0.5 ||
                 data.nudity?.sexual_display > 0.5 ||
                 data.nudity?.erotica > 0.6;

  const gore     = data.gore?.prob > 0.7;
  const weapon   = data.weapon?.classes?.firearm > 0.7;
  const drug     = data.drug?.prob > 0.7;
  const minorRisk = data.face?.attributes?.minor === true;

  const safe = !nudity && !gore && !weapon && !drug && !minorRisk;

  const reasons = [
    nudity   && 'nudity',
    gore     && 'gore',
    weapon   && 'weapon',
    drug     && 'drug',
    minorRisk && 'minor_detected',
  ].filter(Boolean);

  return {
    safe,
    reason: reasons.join(', ') || null,
    scores: {
      nudity: data.nudity?.sexual_activity,
      gore: data.gore?.prob,
      weapon: data.weapon?.classes?.firearm,
    },
    provider: 'sightengine',
    raw: data,
  };
}

// ─── AWS REKOGNITION ──────────────────────────────────────────
async function moderateViaRekognition(imageUrl) {
  const {
    RekognitionClient,
    DetectModerationLabelsCommand,
  } = require('@aws-sdk/client-rekognition');

  const client = new RekognitionClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Fetch image as buffer for Rekognition
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBytes = Buffer.from(response.data);

  const command = new DetectModerationLabelsCommand({
    Image: { Bytes: imageBytes },
    MinConfidence: 70,
  });

  const result = await client.send(command);
  const labels = result.ModerationLabels || [];

  const blocklist = [
    'Explicit Nudity', 'Nudity', 'Sexual Activity',
    'Graphic Violence', 'Gore', 'Drug Use', 'Weapons',
  ];

  const flagged = labels.filter((l) =>
    blocklist.some((b) => l.Name.includes(b) || l.ParentName?.includes(b))
  );

  return {
    safe: flagged.length === 0,
    reason: flagged.map((l) => l.Name).join(', ') || null,
    scores: Object.fromEntries(labels.map((l) => [l.Name, l.Confidence / 100])),
    provider: 'rekognition',
    raw: labels,
  };
}

// ─── LOG-ONLY (dev / fallback) ────────────────────────────────
async function moderateLog(imageUrl) {
  console.log(`[moderation] log-only check: ${imageUrl}`);
  return { safe: true, reason: null, provider: 'log' };
}

// ─── MAIN EXPORT ──────────────────────────────────────────────
async function moderateImage(imageUrl) {
  try {
    let result;

    switch (PROVIDER) {
      case 'sightengine':
        result = await moderateViaSightengine(imageUrl);
        break;
      case 'rekognition':
        result = await moderateViaRekognition(imageUrl);
        break;
      case 'both':
        // Use Sightengine first, Rekognition as double-check on pass
        result = await moderateViaSightengine(imageUrl);
        if (result.safe) {
          const rekResult = await moderateViaRekognition(imageUrl);
          if (!rekResult.safe) result = rekResult;
        }
        break;
      default:
        result = await moderateLog(imageUrl);
    }

    console.log(`[moderation] ${result.safe ? '✅' : '🚫'} ${imageUrl} — ${result.provider}${result.reason ? ` (${result.reason})` : ''}`);
    return result;
  } catch (err) {
    console.error('[moderation] error:', err.message);
    // Fail open in dev, fail closed in prod
    const failOpen = process.env.NODE_ENV !== 'production';
    return {
      safe: failOpen,
      reason: `moderation_error: ${err.message}`,
      provider: 'error',
    };
  }
}

// ─── REVIEW QUEUE HELPERS ─────────────────────────────────────
async function getPendingQueue(limit = 50, offset = 0) {
  const { rows } = await db.query(
    `SELECT mq.*, u.display_name, u.email
     FROM moderation_queue mq
     JOIN users u ON u.id = mq.user_id
     WHERE mq.status = 'pending'
     ORDER BY mq.created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function approvePhoto(queueId, reviewerId) {
  await db.query(
    `UPDATE moderation_queue
     SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
     WHERE id = $2`,
    [reviewerId, queueId]
  );
  await db.query(
    `UPDATE user_photos SET approved = TRUE
     WHERE url = (SELECT photo_url FROM moderation_queue WHERE id = $1)`,
    [queueId]
  );
}

async function rejectPhoto(queueId, reviewerId, reason) {
  const { rows } = await db.query(
    `UPDATE moderation_queue
     SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reason = $2
     WHERE id = $3 RETURNING photo_url, user_id`,
    [reviewerId, reason, queueId]
  );

  if (rows[0]) {
    await db.query(
      `DELETE FROM user_photos WHERE url = $1 AND user_id = $2`,
      [rows[0].photo_url, rows[0].user_id]
    );
  }
}

module.exports = {
  moderateImage,
  getPendingQueue,
  approvePhoto,
  rejectPhoto,
};
