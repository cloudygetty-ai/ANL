// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { getPendingQueue, approvePhoto, rejectPhoto } = require('../services/moderation');

// ─── ADMIN GUARD ──────────────────────────────────────────────
const adminOnly = async (req, res, next) => {
  const { rows } = await db.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]?.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
};

router.use(auth, adminOnly);

// ─── DASHBOARD STATS ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users, matches, messages, revenue, reports, mq] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') AS new_today,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7d') AS new_week,
          COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '24h') AS dau,
          COUNT(*) FILTER (WHERE subscription_tier = 'plus') AS plus_users,
          COUNT(*) FILTER (WHERE subscription_tier = 'premium') AS premium_users
        FROM users WHERE deleted_at IS NULL
      `),
      db.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') AS today
        FROM matches
      `),
      db.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') AS today
        FROM messages
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE subscription_tier = 'plus') * 9.99 +
          COUNT(*) FILTER (WHERE subscription_tier = 'premium') * 24.99 AS mrr
        FROM users WHERE subscription_status = 'active'
      `),
      db.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'pending') AS pending
        FROM user_reports
      `),
      db.query(`SELECT COUNT(*) AS pending FROM moderation_queue WHERE status = 'pending'`),
    ]);

    res.json({
      users: users.rows[0],
      matches: matches.rows[0],
      messages: messages.rows[0],
      revenue: revenue.rows[0],
      reports: reports.rows[0],
      moderation: mq.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USER MANAGEMENT ──────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { page = 1, limit = 50, search, tier, status } = req.query;
  const offset = (page - 1) * limit;

  try {
    let where = ['u.deleted_at IS NULL'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.display_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (tier) {
      params.push(tier);
      where.push(`u.subscription_tier = $${params.length}`);
    }
    if (status === 'banned') where.push('u.is_banned = TRUE');
    if (status === 'active') where.push('u.last_active > NOW() - INTERVAL \'7d\'');

    params.push(limit, offset);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT u.id, u.display_name, u.email, u.age, u.subscription_tier,
              u.subscription_status, u.is_banned, u.is_admin, u.created_at,
              u.last_active,
              (SELECT COUNT(*) FROM matches WHERE user1_id = u.id OR user2_id = u.id) AS match_count,
              (SELECT COUNT(*) FROM user_photos WHERE user_id = u.id) AS photo_count
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({ users: rows, total: parseInt(countRows[0].count), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.*, 
              json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL) AS photos,
              (SELECT COUNT(*) FROM matches WHERE user1_id = u.id OR user2_id = u.id) AS match_count,
              (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) AS message_count,
              (SELECT COUNT(*) FROM user_reports WHERE reported_id = u.id) AS report_count
       FROM users u
       LEFT JOIN user_photos p ON p.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  const { reason } = req.body;
  try {
    await db.query(
      `UPDATE users SET is_banned = TRUE, ban_reason = $1, banned_at = NOW(),
       banned_by = $2 WHERE id = $3`,
      [reason, req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/unban', async (req, res) => {
  try {
    await db.query(
      `UPDATE users SET is_banned = FALSE, ban_reason = NULL, banned_at = NULL WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.query(
      `UPDATE users SET deleted_at = NOW(), email = CONCAT('deleted_', id, '@anl.app'),
       display_name = 'Deleted User' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MODERATION QUEUE ─────────────────────────────────────────
router.get('/moderation', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const queue = await getPendingQueue(limit, (page - 1) * limit);
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/moderation/:id/approve', async (req, res) => {
  try {
    await approvePhoto(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/moderation/:id/reject', async (req, res) => {
  const { reason } = req.body;
  try {
    await rejectPhoto(req.params.id, req.user.id, reason);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, 
              reporter.display_name AS reporter_name,
              reported.display_name AS reported_name
       FROM user_reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       JOIN users reported ON reported.id = r.reported_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reports/:id/resolve', async (req, res) => {
  const { action, notes } = req.body; // action: 'dismiss' | 'warn' | 'ban'
  try {
    await db.query(
      `UPDATE user_reports SET status = 'resolved', resolved_by = $1,
       resolved_at = NOW(), resolution = $2, resolution_notes = $3 WHERE id = $4`,
      [req.user.id, action, notes, req.params.id]
    );

    if (action === 'ban') {
      const { rows } = await db.query(
        'SELECT reported_id FROM user_reports WHERE id = $1', [req.params.id]
      );
      await db.query(
        `UPDATE users SET is_banned = TRUE, ban_reason = $1 WHERE id = $2`,
        [notes || 'Banned via report', rows[0]?.reported_id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ANALYTICS ────────────────────────────────────────────────
router.get('/analytics/growth', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS new_users,
        COUNT(*) FILTER (WHERE subscription_tier != 'free') AS paid_signups
      FROM users
      WHERE created_at > NOW() - INTERVAL '30d'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/analytics/retention', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        DATE_TRUNC('week', created_at) AS cohort_week,
        COUNT(*) AS cohort_size,
        COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '7d') AS retained_7d,
        COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '30d') AS retained_30d
      FROM users
      WHERE created_at > NOW() - INTERVAL '90d' AND deleted_at IS NULL
      GROUP BY cohort_week ORDER BY cohort_week ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
