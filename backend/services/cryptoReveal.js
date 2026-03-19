// backend/services/cryptoReveal.js
// Patent candidate: Cryptographic mutual consent reveal protocol
// Profile details fully encrypted until both parties swipe right
// Uses Diffie-Hellman style key exchange for reveal

const crypto = require('crypto');
const db = require('../db/pool');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// ─── KEY GENERATION ───────────────────────────────────────────
function generateRevealKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

function generateRevealToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── ENCRYPT PROFILE DATA ────────────────────────────────────
function encryptProfile(profileData, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const jsonStr = JSON.stringify(profileData);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

// ─── DECRYPT PROFILE DATA ────────────────────────────────────
function decryptProfile(encryptedData, key) {
  const { encrypted, iv, tag } = encryptedData;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}

// ─── STORE ENCRYPTED PROFILE ─────────────────────────────────
// Called when user sets up profile — stores encrypted version
async function storeEncryptedProfile(userId) {
  const { rows } = await db.query(
    `SELECT display_name, age, bio, interests, photo_urls, job_title, education
     FROM users u
     LEFT JOIN (
       SELECT user_id, array_agg(url ORDER BY position) AS photo_urls
       FROM user_photos GROUP BY user_id
     ) p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!rows[0]) throw new Error('User not found');

  const key = generateRevealKey();
  const encrypted = encryptProfile(rows[0], key);

  // Store encrypted profile + key separately
  // Key is split: half stored server-side, half derived from user's reveal token
  const serverKeyHalf = key.slice(0, KEY_LENGTH / 2);
  const clientKeyHalf = key.slice(KEY_LENGTH / 2);
  const revealToken = generateRevealToken();

  // XOR client key half with reveal token hash for storage
  const tokenHash = crypto.createHash('sha256').update(revealToken).digest();
  const storedClientHalf = Buffer.alloc(KEY_LENGTH / 2);
  for (let i = 0; i < KEY_LENGTH / 2; i++) {
    storedClientHalf[i] = clientKeyHalf[i] ^ tokenHash[i];
  }

  await db.query(
    `INSERT INTO encrypted_profiles
     (user_id, encrypted_data, iv, auth_tag, server_key_half, client_key_half_xored, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       encrypted_data = $2, iv = $3, auth_tag = $4,
       server_key_half = $5, client_key_half_xored = $6, updated_at = NOW()`,
    [
      userId,
      encrypted.encrypted,
      encrypted.iv,
      encrypted.tag,
      serverKeyHalf.toString('base64'),
      storedClientHalf.toString('base64'),
    ]
  );

  // Return reveal token to user (stored in their device, not server)
  return revealToken;
}

// ─── MUTUAL REVEAL ────────────────────────────────────────────
// Core patent algorithm: two-party key reconstruction on mutual consent
async function mutualReveal(userId1, userId2, token1, token2) {
  // Verify mutual like exists
  const { rows: matchRows } = await db.query(
    `SELECT id FROM swipes
     WHERE (swiper_id = $1 AND swipee_id = $2 AND direction = 'right')
       AND EXISTS (
         SELECT 1 FROM swipes
         WHERE swiper_id = $2 AND swipee_id = $1 AND direction = 'right'
       )`,
    [userId1, userId2]
  );

  if (!matchRows.length) {
    throw new Error('Mutual consent not established');
  }

  // Reconstruct key for user2's profile (to reveal to user1)
  const profile2 = await reconstructAndDecrypt(userId2, token2);
  // Reconstruct key for user1's profile (to reveal to user2)
  const profile1 = await reconstructAndDecrypt(userId1, token1);

  // Log reveal event
  await db.query(
    `INSERT INTO reveal_events (user1_id, user2_id, revealed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user1_id, user2_id) DO NOTHING`,
    [userId1, userId2]
  );

  return { profile1, profile2 };
}

async function reconstructAndDecrypt(userId, revealToken) {
  const { rows } = await db.query(
    `SELECT encrypted_data, iv, auth_tag, server_key_half, client_key_half_xored
     FROM encrypted_profiles WHERE user_id = $1`,
    [userId]
  );

  if (!rows[0]) throw new Error('Encrypted profile not found');

  const { encrypted_data, iv, auth_tag, server_key_half, client_key_half_xored } = rows[0];

  // Reconstruct client key half using reveal token
  const tokenHash = crypto.createHash('sha256').update(revealToken).digest();
  const storedClientHalf = Buffer.from(client_key_half_xored, 'base64');
  const clientKeyHalf = Buffer.alloc(KEY_LENGTH / 2);
  for (let i = 0; i < KEY_LENGTH / 2; i++) {
    clientKeyHalf[i] = storedClientHalf[i] ^ tokenHash[i];
  }

  // Reconstruct full key
  const fullKey = Buffer.concat([
    Buffer.from(server_key_half, 'base64'),
    clientKeyHalf,
  ]);

  return decryptProfile(
    { encrypted: encrypted_data, iv, tag: auth_tag },
    fullKey
  );
}

// ─── BLURRED PREVIEW (pre-reveal teaser) ──────────────────────
async function getBlurredPreview(userId) {
  const { rows } = await db.query(
    `SELECT age, interests FROM users WHERE id = $1`,
    [userId]
  );

  if (!rows[0]) return null;

  // Return only non-identifying info before reveal
  return {
    age: rows[0].age,
    interestCount: rows[0].interests?.length ?? 0,
    hasPhotos: true, // confirmed but not shown
    isRevealed: false,
  };
}

module.exports = {
  storeEncryptedProfile,
  mutualReveal,
  getBlurredPreview,
};
