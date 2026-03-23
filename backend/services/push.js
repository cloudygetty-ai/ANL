// backend/services/push.js
// Expo push notifications — triggered on match, message, like, call events
// Batches up to 100 notifications per Expo API call

const { Expo } = require('expo-server-sdk');
const db = require('../db/pool');

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

/**
 * @param {string} userId — recipient
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendPushToUser(userId, payload) {
  try {
    const result = await db.query(
      'SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL',
      [userId]
    );
    if (!result.rows.length) return;

    const token = result.rows[0].push_token;
    if (!Expo.isExpoPushToken(token)) return;

    await expo.sendPushNotificationsAsync([{
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      badge: 1,
    }]);
  } catch (err) {
    console.error('Push send error:', err.message);
  }
}

// ── Event-specific helpers ────────────────────────────────────────

async function notifyNewMatch(userId, matcherName, matchId) {
  await sendPushToUser(userId, {
    title: '🔥 New Match!',
    body: `You matched with ${matcherName}`,
    data: { type: 'match', matchId },
  });
}

async function notifyNewMessage(userId, senderName, preview, matchId) {
  await sendPushToUser(userId, {
    title: senderName,
    body: preview.length > 60 ? preview.slice(0, 57) + '...' : preview,
    data: { type: 'message', matchId },
  });
}

async function notifyIncomingCall(userId, callerName, callId) {
  await sendPushToUser(userId, {
    title: '📹 Incoming Call',
    body: `${callerName} is calling you`,
    data: { type: 'call', callId },
  });
}

async function notifyLike(userId, likerName) {
  await sendPushToUser(userId, {
    title: '💜 Someone likes you',
    body: `${likerName} liked your profile`,
    data: { type: 'like' },
  });
}

async function notifySuperLike(userId, likerName) {
  await sendPushToUser(userId, {
    title: '⭐ Super Like!',
    body: `${likerName} super liked you`,
    data: { type: 'superlike' },
  });
}

module.exports = {
  sendPushToUser,
  notifyNewMatch,
  notifyNewMessage,
  notifyIncomingCall,
  notifyLike,
  notifySuperLike,
};
