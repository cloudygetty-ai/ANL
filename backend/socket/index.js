// backend/socket/index.js
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const { recordActivity } = require('../services/circadian');
const { detectVenueMatches } = require('../services/venueMatching');
const { ingestSnapshot, computeChemistryScore, generateCallReport } = require('../services/voiceTone');

const onlineUsers = new Map(); // userId → Set<socketId>

function registerSocket(io) {
  // Store io on app for route access
  io.on('connection', async (socket) => {
    // ─── AUTH ──────────────────────────────────────────────
    const token = socket.handshake.auth.token;
    if (!token) return socket.disconnect();

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch {
      return socket.disconnect();
    }

    // Register presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    await db.query(
      `UPDATE users SET is_online = TRUE, last_active = NOW() WHERE id = $1`,
      [userId]
    );
    broadcastPresence(io, userId, true);
    recordActivity(userId, 'app_open').catch(console.error);

    console.log(`[socket] connected: ${userId}`);

    // ─── MESSAGING ────────────────────────────────────────
    socket.on('message:send', async ({ matchId, content, type = 'text' }) => {
      try {
        recordActivity(userId, 'message_sent').catch(console.error);

        const { rows } = await db.query(
          `INSERT INTO messages (match_id, sender_id, content, type, created_at)
           VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
          [matchId, userId, content, type]
        );
        const msg = rows[0];

        // Get match partner
        const { rows: matchRows } = await db.query(
          `SELECT CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END AS partner_id
           FROM matches WHERE id = $2`,
          [userId, matchId]
        );

        const partnerId = matchRows[0]?.partner_id;
        if (partnerId) {
          emitToUser(io, partnerId, 'message:received', { ...msg, matchId });
        }

        socket.emit('message:sent', msg);
      } catch (err) {
        socket.emit('error', { event: 'message:send', message: err.message });
      }
    });

    socket.on('message:read', async ({ matchId, messageId }) => {
      await db.query(
        `UPDATE messages SET read_at = NOW() WHERE id = $1 AND match_id = $2`,
        [messageId, matchId]
      );
      const { rows } = await db.query(
        `SELECT CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END AS partner_id
         FROM matches WHERE id = $2`,
        [userId, matchId]
      );
      if (rows[0]) emitToUser(io, rows[0].partner_id, 'message:read', { matchId, messageId });
    });

    socket.on('typing:start', ({ matchId }) => {
      broadcastToMatch(io, userId, matchId, 'typing:start', { matchId, userId });
    });

    socket.on('typing:stop', ({ matchId }) => {
      broadcastToMatch(io, userId, matchId, 'typing:stop', { matchId, userId });
    });

    // ─── LOCATION + VENUE MATCHING ────────────────────────
    socket.on('location:update', async ({ lat, lng }) => {
      try {
        recordActivity(userId, 'location_update').catch(console.error);

        await db.query(
          `UPDATE users SET lat = $1, lng = $2, location_updated_at = NOW() WHERE id = $3`,
          [lat, lng, userId]
        );

        const { handleLocationUpdate } = require('../services/venueMatching');
        const venue = await handleLocationUpdate(userId, lat, lng);

        if (venue) {
          // Check for venue-triggered matches
          const triggers = await detectVenueMatches(userId);

          for (const trigger of triggers) {
            // Notify this user
            socket.emit('venue:match_nearby', {
              userId: trigger.userId,
              displayName: trigger.displayName,
              venueId: trigger.venueId,
              dwellMinutes: trigger.dwellMinutes,
              alreadyMatched: trigger.alreadyMatched,
            });

            // Notify the other user
            emitToUser(io, trigger.userId, 'venue:match_nearby', {
              userId,
              venueId: trigger.venueId,
              dwellMinutes: trigger.dwellMinutes,
              alreadyMatched: trigger.alreadyMatched,
            });
          }
        }
      } catch (err) {
        console.error('[socket] location:update error:', err.message);
      }
    });

    // ─── VOICE TONE SNAPSHOTS (during calls) ──────────────
    socket.on('call:audio_snapshot', async ({ callId, features }) => {
      try {
        await ingestSnapshot(callId, userId, features);

        // Compute live chemistry score every 5 snapshots
        const { rows } = await db.query(
          `SELECT COUNT(*) AS count FROM call_audio_snapshots
           WHERE call_id = $1 AND user_id = $2`,
          [callId, userId]
        );

        if (parseInt(rows[0].count) % 5 === 0) {
          const chemScore = await computeChemistryScore(callId);
          if (chemScore) {
            // Emit to both call participants
            const { rows: callRows } = await db.query(
              `SELECT caller_id, callee_id FROM call_history WHERE call_id = $1`,
              [callId]
            );
            if (callRows[0]) {
              emitToUser(io, callRows[0].caller_id, 'call:chemistry_update', chemScore);
              emitToUser(io, callRows[0].callee_id, 'call:chemistry_update', chemScore);
            }
          }
        }
      } catch (err) {
        console.error('[socket] audio_snapshot error:', err.message);
      }
    });

    // ─── CALL LIFECYCLE ───────────────────────────────────
    socket.on('call:initiate', ({ targetUserId, callType = 'video' }) => {
      if (!isOnline(targetUserId)) {
        return socket.emit('call:unavailable', { targetUserId });
      }
      emitToUser(io, targetUserId, 'call:incoming', {
        callerId: userId,
        callType,
      });
      socket.emit('call:ringing', { targetUserId });
    });

    socket.on('call:accept', async ({ callerId, callType }) => {
      emitToUser(io, callerId, 'call:accepted', { calleeId: userId });

      // Create call history record
      const callId = `${[userId, callerId].sort().join(':')}_${Date.now()}`;
      await db.query(
        `INSERT INTO call_history (call_id, caller_id, callee_id, call_type, started_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (call_id) DO NOTHING`,
        [callId, callerId, userId, callType]
      );

      socket.emit('call:ready', { callId, callerId });
      emitToUser(io, callerId, 'call:ready', { callId, calleeId: userId });
    });

    socket.on('call:reject', ({ callerId }) => {
      emitToUser(io, callerId, 'call:rejected', { calleeId: userId });
    });

    socket.on('call:end', async ({ callId, targetUserId: partnerId }) => {
      emitToUser(io, partnerId, 'call:ended', { callId });

      // Generate final chemistry report (async)
      if (callId) {
        generateCallReport(callId).then((report) => {
          if (report) {
            emitToUser(io, userId, 'call:report', report);
            emitToUser(io, partnerId, 'call:report', report);
          }
        }).catch(console.error);
      }
    });

    // ─── WEBRTC SIGNALING ────────────────────────────────
    socket.on('webrtc:offer', ({ targetUserId, offer, callId }) => {
      emitToUser(io, targetUserId, 'webrtc:offer', { fromUserId: userId, offer, callId });
    });
    socket.on('webrtc:answer', ({ targetUserId, answer, callId }) => {
      emitToUser(io, targetUserId, 'webrtc:answer', { fromUserId: userId, answer, callId });
    });
    socket.on('webrtc:ice-candidate', ({ targetUserId, candidate, callId }) => {
      emitToUser(io, targetUserId, 'webrtc:ice-candidate', { fromUserId: userId, candidate, callId });
    });

    // ─── DISCONNECT ───────────────────────────────────────
    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await db.query(
            `UPDATE users SET is_online = FALSE, last_active = NOW() WHERE id = $1`,
            [userId]
          );
          broadcastPresence(io, userId, false);
        }
      }
      console.log(`[socket] disconnected: ${userId}`);
    });
  });
}

// ─── HELPERS ──────────────────────────────────────────────────
function isOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

function emitToUser(io, userId, event, data) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  for (const socketId of sockets) io.to(socketId).emit(event, data);
}

async function broadcastPresence(io, userId, online) {
  try {
    const { rows } = await db.query(
      `SELECT CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END AS partner_id
       FROM matches WHERE (user1_id = $1 OR user2_id = $1) AND is_active = TRUE`,
      [userId]
    );
    for (const { partner_id } of rows) {
      emitToUser(io, partner_id, online ? 'user:online' : 'user:offline', { userId });
    }
  } catch (err) {
    console.error('[socket] broadcastPresence error:', err.message);
  }
}

async function broadcastToMatch(io, senderId, matchId, event, data) {
  try {
    const { rows } = await db.query(
      `SELECT CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END AS partner_id
       FROM matches WHERE id = $2`,
      [senderId, matchId]
    );
    if (rows[0]) emitToUser(io, rows[0].partner_id, event, data);
  } catch (err) {
    console.error('[socket] broadcastToMatch error:', err.message);
  }
}

module.exports = { registerSocket, isOnline, emitToUser };
