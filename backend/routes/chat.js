// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/:matchId', auth, async (req, res) => {
  const { matchId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  try {
    const { rows: matchRows } = await db.query(
      'SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [matchId, req.user.id]
    );
    if (!matchRows[0]) return res.status(403).json({ error: 'Not part of this match' });
    const { rows } = await db.query(
      'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at DESC LIMIT $2',
      [matchId, limit]
    );
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const VALID_MSG_TYPES = new Set(['text', 'image', 'audio']);

router.post('/:matchId', auth, async (req, res) => {
  const { matchId } = req.params;
  const { content, type = 'text' } = req.body;
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'content required' });
  if (content.length > 500) return res.status(400).json({ error: 'Message too long' });
  if (!VALID_MSG_TYPES.has(type)) return res.status(400).json({ error: 'Invalid type' });
  try {
    const { rows: matchRows } = await db.query(
      'SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND is_active = TRUE',
      [matchId, req.user.id]
    );
    if (!matchRows[0]) return res.status(403).json({ error: 'Not part of this match' });
    const { rows } = await db.query(
      'INSERT INTO messages (match_id, sender_id, content, type, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [matchId, req.user.id, content, type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
