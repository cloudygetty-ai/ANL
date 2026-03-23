// backend/services/turn.js
// Generates short-lived TURN credentials per RFC 5389
// Credentials expire after TTL — prevents credential sharing

const crypto = require('crypto');

const TURN_SECRET = process.env.TURN_SECRET;
const TURN_HOST = process.env.TURN_HOST; // e.g. turn.anl.app or Railway URL
const TTL = 86400; // 24 hours in seconds

/**
 * Generate time-limited TURN credentials for a user
 * @param {string} userId
 * @returns {{ iceServers: RTCIceServer[] }}
 */
function generateTurnCredentials(userId) {
  if (!TURN_SECRET || !TURN_HOST) {
    // Dev fallback — STUN only
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }

  const timestamp = Math.floor(Date.now() / 1000) + TTL;
  const username = `${timestamp}:${userId}`;
  const credential = crypto
    .createHmac('sha1', TURN_SECRET)
    .update(username)
    .digest('base64');

  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: [
          `turn:${TURN_HOST}:3478?transport=udp`,
          `turn:${TURN_HOST}:3478?transport=tcp`,
          `turns:${TURN_HOST}:5349?transport=tcp`,
        ],
        username,
        credential,
      },
    ],
    ttl: TTL,
  };
}

module.exports = { generateTurnCredentials };
