// backend/server.js
require('dotenv').config();

// Sentry must init before anything else
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

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
const otpRouter       = require('./routes/otp');

const app = express();
const httpServer = createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin && process.env.NODE_ENV === 'production') {
  console.warn('[server] CORS_ORIGIN not set — defaulting to * (lock this down in production)');
}
const resolvedOrigin = corsOrigin ?? '*';

const io = new Server(httpServer, {
  cors: { origin: resolvedOrigin, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});
app.set('io', io); // Make io accessible in routes
registerSocket(io);
attachRedisAdapter(io);

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: resolvedOrigin, credentials: true }));

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
app.use('/api/otp',       authLimiter, otpRouter);
app.use('/api/users',     usersRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/matches',   matchesRouter);
app.use('/api/chat',      chatRouter);
app.use('/api/upload',    uploadRouter);
app.use('/api/stripe',    stripeRouter);
app.use('/api/admin',     adminRouter);
app.use('/api/ice',       iceRouter);
app.use('/api/push',      pushRouter);
app.use('/api/livekit',   livekitRouter);

// ─── HEALTH ───────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const uptime = process.uptime();
  const mem    = process.memoryUsage();

  // Real dependency checks
  let dbStatus = 'ok', dbMeta = {};
  try { dbMeta = await require('./db/pool').healthCheck(); }
  catch (e) { dbStatus = 'error'; dbMeta = { error: e.message }; }

  const redisOk = !!process.env.REDIS_URL; // adapter logs its own status

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    memory: { rss: `${Math.round(mem.rss / 1024 / 1024)}MB`, heap: `${Math.round(mem.heapUsed / 1024 / 1024)}MB` },
    db:    { status: dbStatus, ...dbMeta },
    redis: { configured: redisOk },
  });
});

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

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
