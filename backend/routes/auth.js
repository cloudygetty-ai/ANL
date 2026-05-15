// backend/routes/auth.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const db      = require('../db/pool');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAuth(email, password) {
  if (!email || !password) return 'Email and password required';
  if (!EMAIL_RE.test(email)) return 'Invalid email format';
  if (password.length < 8)  return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password too long';
  return null;
}

// ─── REGISTER ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  const err = validateAuth(email, password);
  if (err) return res.status(400).json({ error: err });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, display_name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, display_name',
      [email.toLowerCase().trim(), hash, displayName || email.split('@')[0]]
    );
    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ user: rows[0], token });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    console.error('[auth/register]', e.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const err = validateAuth(email, password);
  if (err) return res.status(400).json({ error: err });

  try {
    const { rows } = await db.query(
      'SELECT id, email, display_name, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    // Constant-time compare even on missing user (prevent timing oracle)
    const valid = user ? await bcrypt.compare(password, user.password_hash) : await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000');
    if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name }, token });
  } catch (e) {
    console.error('[auth/login]', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
