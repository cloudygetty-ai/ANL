// backend/routes/matches.js
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT m.*, CASE WHEN m.user1_id = $1 THEN u2.id ELSE u1.id END AS partner_id, CASE WHEN m.user1_id = $1 THEN u2.display_name ELSE u1.display_name END AS partner_name FROM matches m JOIN users u1 ON u1.id = m.user1_id JOIN users u2 ON u2.id = m.user2_id WHERE (m.user1_id = $1 OR m.user2_id = $1) AND m.is_active = TRUE ORDER BY m.created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
  if (targetUserId === req.user.id) return res.status(400).json({ error: 'Cannot match with self' });
  try {
    const { rows: mutual } = await db.query(
      `SELECT 1 FROM swipes WHERE swiper_id = $1 AND swipee_id = $2 AND direction IN ('right','super') LIMIT 1`,
      [req.user.id, targetUserId]
    );
    const { rows: reverse } = await db.query(
      `SELECT 1 FROM swipes WHERE swiper_id = $1 AND swipee_id = $2 AND direction IN ('right','super') LIMIT 1`,
      [targetUserId, req.user.id]
    );
    if (!mutual.length || !reverse.length) {
      return res.status(403).json({ error: 'Mutual consent required' });
    }
    const [u1, u2] = [req.user.id, targetUserId].sort();
    const { rows } = await db.query(
      'INSERT INTO matches (user1_id, user2_id, is_active, created_at) VALUES ($1, $2, TRUE, NOW()) ON CONFLICT (user1_id, user2_id) DO UPDATE SET is_active = TRUE RETURNING *',
      [u1, u2]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(500).json({ error: msg });
  }
});

router.delete('/:matchId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE matches SET is_active = FALSE WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) RETURNING user1_id, user2_id',
      [req.params.matchId, req.user.id]
    );
    if (rows[0]) {
      const partnerId = rows[0].user1_id === req.user.id ? rows[0].user2_id : rows[0].user1_id;
      const io = req.app.get('io');
      io?.to(`user:${partnerId}`).emit('match:removed', { matchId: req.params.matchId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
