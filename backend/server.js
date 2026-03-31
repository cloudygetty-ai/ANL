// backend/server.js — All Night Long API server
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// ─── SOCKET.IO (signaling + real-time events) ─────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Expose io to routes if needed
app.set('io', io);

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Stripe webhook needs raw body — mount BEFORE express.json()
try {
  const stripeRouter = require('./routes/stripe');
  app.use('/api/stripe', stripeRouter);
} catch (err) {
  console.warn('[server] stripe routes unavailable:', err.message);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ─── ROUTES ───────────────────────────────────────────────────
try {
  app.use('/api/upload', require('./routes/upload'));
} catch (err) {
  console.warn('[server] upload routes unavailable:', err.message);
}

try {
  app.use('/api/admin', require('./routes/admin'));
} catch (err) {
  console.warn('[server] admin routes unavailable:', err.message);
}

// ─── SOCKET.IO EVENTS (match notifications, messaging) ────────
const userSockets = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  if (userId) {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    console.log(`[socket] connected: ${userId} (${socket.id})`);
  }

  socket.on('disconnect', () => {
    if (userId) {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
    }
    console.log(`[socket] disconnected: ${socket.id}`);
  });

  // Relay match/message events to target user
  socket.on('notify:match', ({ targetUserId, ...data }) => {
    const targets = userSockets.get(targetUserId);
    if (targets) targets.forEach((sid) => io.to(sid).emit('match:new', data));
  });

  socket.on('notify:message', ({ targetUserId, ...data }) => {
    const targets = userSockets.get(targetUserId);
    if (targets) targets.forEach((sid) => io.to(sid).emit('message:new', data));
  });
});

// ─── 404 HANDLER ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[server] unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] All Night Long API running on port ${PORT}`);
  console.log(`[server] Health: http://localhost:${PORT}/health`);
  if (!process.env.DATABASE_URL) {
    console.warn('[server] DATABASE_URL not set — DB-dependent routes will fail');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[server] STRIPE_SECRET_KEY not set — Stripe routes will fail');
  }
});

module.exports = { app, httpServer, io };
