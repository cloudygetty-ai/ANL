// backend/server.js
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { registerSocket } = require('./socket/index');
const { attachRedisAdapter } = require('./socket/adapter');

// ─── ROUTES ───────────────────────────────────────────────────
const authRouter      = require('./routes/auth');
const usersRouter     = require('./routes/users');
const discoveryRouter = require('./routes/discovery');
const matchesRouter   = require('./routes/matches');
const chatRouter      = require('./routes/chat');
const uploadRouter    = require('./routes/upload');
const adminRouter     = require('./routes/admin');
const iceRouter       = require('./routes/ice');
const pushRouter      = require('./routes/push');

// Stripe webhook must receive raw body — mount BEFORE express.json()
const stripeRouter    = require('./routes/stripe');

const app = express();
const httpServer = createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});
app.set('io', io); // Make io accessible in routes
registerSocket(io);
attachRedisAdapter(io);

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Stripe webhook — raw body required
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});

// ─── ROUTES ───────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRouter);
app.use('/api/users',     usersRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/matches',   matchesRouter);
app.use('/api/chat',      chatRouter);
app.use('/api/upload',    uploadRouter);
app.use('/api/stripe',    stripeRouter);
app.use('/api/admin',     adminRouter);
app.use('/api/ice',       iceRouter);
app.use('/api/push',      pushRouter);

// ─── HEALTH ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      circadian:       '✅',
      venueMatching:   '✅',
      voiceTone:       '✅',
      cryptoReveal:    '✅',
      socialExclusion: '✅',
    },
  });
});

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[server] ANL backend running on port ${PORT}`);
  console.log(`[server] Patent features: circadian, venue, voice, crypto-reveal, social-graph`);
});

module.exports = { app, io };
