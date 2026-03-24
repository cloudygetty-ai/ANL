// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db/pool');

router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, display_name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, display_name',
      [email, password, displayName || email.split('@')[0]]
    );
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ user: rows[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await db.query(
      'SELECT id, email, display_name, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    if (!rows[0] || rows[0].password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
