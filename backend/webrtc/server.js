// webrtc/server.js — Standalone WebRTC signaling server
// Run separately: node webrtc/server.js
// Or mount as a path in your main Express app

const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const PORT = process.env.WEBRTC_PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET;

// Active calls: callId → { caller, callee, startedAt, type }
const activeCalls = new Map();

// User → Set of socket IDs (multi-device support)
const userSockets = new Map();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ─── HELPERS ──────────────────────────────────────────────────
function emit(userId, event, data) {
  const sockets = userSockets.get(userId);
  if (!sockets) return false;
  for (const sid of sockets) io.to(sid).emit(event, data);
  return true;
}

function generateCallId(a, b) {
  return [a, b].sort().join(':') + ':' + Date.now();
}

// ─── CONNECTION ───────────────────────────────────────────────
io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`[rtc] connected: ${userId} (${socket.id})`);

  // Register socket
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);

  // ─── INITIATE CALL ────────────────────────────────────────
  socket.on('call:initiate', ({ targetUserId, callType = 'video' }) => {
    // Check target is online
    if (!userSockets.has(targetUserId)) {
      return socket.emit('call:unavailable', { targetUserId });
    }

    const callId = generateCallId(userId, targetUserId);
    activeCalls.set(callId, {
      callId,
      caller: userId,
      callee: targetUserId,
      type: callType,
      startedAt: null,
      status: 'ringing',
    });

    emit(targetUserId, 'call:incoming', {
      callId,
      callerId: userId,
      callType,
    });

    socket.emit('call:ringing', { callId, targetUserId });
    console.log(`[rtc] call initiated: ${callId} (${callType})`);
  });

  // ─── ACCEPT CALL ──────────────────────────────────────────
  socket.on('call:accept', ({ callId }) => {
    const call = activeCalls.get(callId);
    if (!call) return socket.emit('call:error', { message: 'Call not found' });

    call.status = 'connected';
    call.startedAt = Date.now();

    emit(call.caller, 'call:accepted', { callId, calleeId: userId });
    socket.emit('call:ready', { callId, callerId: call.caller });
    console.log(`[rtc] call accepted: ${callId}`);
  });

  // ─── REJECT CALL ──────────────────────────────────────────
  socket.on('call:reject', ({ callId, reason = 'declined' }) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    emit(call.caller, 'call:rejected', { callId, reason });
    activeCalls.delete(callId);
    console.log(`[rtc] call rejected: ${callId} (${reason})`);
  });

  // ─── END CALL ─────────────────────────────────────────────
  socket.on('call:end', ({ callId }) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    const duration = call.startedAt ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;
    const other = call.caller === userId ? call.callee : call.caller;

    emit(other, 'call:ended', { callId, duration });
    socket.emit('call:ended', { callId, duration });
    activeCalls.delete(callId);
    console.log(`[rtc] call ended: ${callId} (${duration}s)`);
  });

  // ─── WEBRTC SIGNALING ────────────────────────────────────
  socket.on('webrtc:offer', ({ callId, targetUserId, offer }) => {
    emit(targetUserId, 'webrtc:offer', { callId, fromUserId: userId, offer });
  });

  socket.on('webrtc:answer', ({ callId, targetUserId, answer }) => {
    emit(targetUserId, 'webrtc:answer', { callId, fromUserId: userId, answer });
  });

  socket.on('webrtc:ice-candidate', ({ callId, targetUserId, candidate }) => {
    emit(targetUserId, 'webrtc:ice-candidate', { callId, fromUserId: userId, candidate });
  });

  // ─── MEDIA CONTROLS ──────────────────────────────────────
  socket.on('call:toggle-mute', ({ callId, muted }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    const other = call.caller === userId ? call.callee : call.caller;
    emit(other, 'call:peer-muted', { callId, muted });
  });

  socket.on('call:toggle-video', ({ callId, videoOff }) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    const other = call.caller === userId ? call.callee : call.caller;
    emit(other, 'call:peer-video-off', { callId, videoOff });
  });

  // ─── DISCONNECT ───────────────────────────────────────────
  socket.on('disconnect', () => {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) userSockets.delete(userId);
    }

    // End any active calls for this user
    for (const [callId, call] of activeCalls.entries()) {
      if (call.caller === userId || call.callee === userId) {
        const other = call.caller === userId ? call.callee : call.caller;
        emit(other, 'call:ended', { callId, reason: 'disconnected' });
        activeCalls.delete(callId);
      }
    }

    console.log(`[rtc] disconnected: ${userId}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[rtc] WebRTC signaling server running on port ${PORT}`);
});

module.exports = { io, activeCalls };
