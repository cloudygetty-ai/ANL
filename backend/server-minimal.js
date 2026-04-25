// backend/server-minimal.js
// Minimal working ANL backend — no external deps
// Runs on localhost:3001 with in-memory DB for testing
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN?.split(',') || '*' },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// ─── IN-MEMORY DB ─────────────────────────────────────────
const db = {
  users: new Map(),
  sessions: new Map(),
  messages: [],
  matches: new Map(),
};

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── ROUTES ───────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), uptime: process.uptime() });
});

// Auth — OTP (mock)
app.post('/api/auth/send-otp', express.json(), (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  console.log(`[OTP] Sent to ${phone} (use code: 123456 for dev)`);
  res.json({ success: true, message: 'OTP sent (dev: 123456)' });
});

// Auth — verify OTP
app.post('/api/auth/verify-otp', express.json(), (req, res) => {
  const { phone, code } = req.body;
  if (code !== '123456' && code !== '000000') {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  
  let user = Array.from(db.users.values()).find(u => u.phone === phone);
  if (!user) {
    const userId = `user_${Date.now()}`;
    user = {
      id: userId,
      phone,
      displayName: '',
      gender: 'f',
      age: 18,
      bio: '',
      vibe: '',
      presence: 'online',
      vibeTagIds: [],
      blockedIds: [],
      photos: [],
      isVerified: true,
      isPremium: false,
      createdAt: Date.now(),
    };
    db.users.set(userId, user);
  }

  const token = jwt.sign({ userId: user.id, phone }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    success: true,
    user,
    token,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update profile
app.put('/api/users/:id', authMiddleware, express.json(), (req, res) => {
  if (req.user.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = db.users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  Object.assign(user, req.body);
  user.updatedAt = Date.now();
  res.json(user);
});

// Discovery — get nearby users
app.get('/api/discovery/nearby', authMiddleware, (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  // In real app, use PostGIS
  // For dev, return random seed users
  const seedUsers = Array.from(db.users.values())
    .filter(u => u.id !== req.user.userId)
    .slice(0, 10)
    .map(u => ({ ...u, distance: Math.random() * 2 + 0.1 }));
  res.json(seedUsers);
});

// Matches — like/unlike
app.post('/api/matches/like', authMiddleware, express.json(), (req, res) => {
  const { targetUserId } = req.body;
  const key = [req.user.userId, targetUserId].sort().join(':');
  db.matches.set(key, { userId1: req.user.userId, userId2: targetUserId, createdAt: Date.now() });
  res.json({ success: true, matched: true });
});

// Messages — send
app.post('/api/messages/send', authMiddleware, express.json(), (req, res) => {
  const { targetUserId, text } = req.body;
  const msg = {
    id: `msg_${Date.now()}`,
    senderId: req.user.userId,
    targetUserId,
    text,
    createdAt: Date.now(),
  };
  db.messages.push(msg);
  io.emit('chat:message', msg);
  res.json(msg);
});

// Messages — get history
app.get('/api/messages/:userId', authMiddleware, (req, res) => {
  const msgs = db.messages.filter(
    m => (m.senderId === req.user.userId && m.targetUserId === req.params.userId) ||
         (m.senderId === req.params.userId && m.targetUserId === req.user.userId)
  );
  res.json(msgs.sort((a, b) => a.createdAt - b.createdAt));
});

// TURN credentials
app.get('/api/ice/config', authMiddleware, (req, res) => {
  res.json({
    iceServers: [
      { urls: ['stun:stunserver.stunprotocol.org:3478'] },
      {
        urls: ['turn:turn.anl.app:3478'],
        username: req.user.userId,
        credential: jwt.sign({ sub: req.user.userId }, process.env.TURN_SECRET || 'dev', { expiresIn: '1h' }),
      },
    ],
  });
});

// ─── SOCKET.IO ────────────────────────────────────────────

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Auth required'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[IO] User connected: ${socket.user.userId}`);

  socket.on('chat:message', (data) => {
    io.emit('chat:message', { ...data, senderId: socket.user.userId, createdAt: Date.now() });
  });

  socket.on('presence:update', (presence) => {
    const user = db.users.get(socket.user.userId);
    if (user) user.presence = presence;
    io.emit('presence:changed', { userId: socket.user.userId, presence });
  });

  socket.on('disconnect', () => {
    console.log(`[IO] User disconnected: ${socket.user.userId}`);
  });
});

// ─── START ────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ANL BACKEND (MINIMAL)                                     ║
╠════════════════════════════════════════════════════════════╣
║  Listening: http://localhost:${PORT}                        ║
║  WebSocket: ws://localhost:${PORT}                          ║
║  Health: GET http://localhost:${PORT}/api/health           ║
║  Test OTP: 123456 or 000000                                ║
║  JWT Secret: ${JWT_SECRET}                                 ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, httpServer, io };
