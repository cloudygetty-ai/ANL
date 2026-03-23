// backend/routes/push.js
// Registers / removes Expo push tokens per device

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db/pool');
const { Expo } = require('expo-server-sdk');

// POST /api/push/register
router.post('/register', auth, async (req, res) => {
  const { token } = req.body;
  if (!token || !Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Invalid push token' });
  }
  await db.query('UPDATE users SET push_token = $1 WHERE id = $2', [token, req.user.id]);
  res.json({ ok: true });
});

// DELETE /api/push/register
router.delete('/register', auth, async (req, res) => {
  await db.query('UPDATE users SET push_token = NULL WHERE id = $1', [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
