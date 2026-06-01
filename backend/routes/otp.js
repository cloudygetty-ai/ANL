// backend/routes/otp.js
// Twilio Verify OTP — standalone phone auth, no Supabase phone provider required
// POST /api/otp/send   { phone }          → sends SMS code
// POST /api/otp/verify { phone, code }    → returns { token, user }
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID, JWT_SECRET

const express = require('express');
const router  = express.Router();
const twilio  = require('twilio');
const jwt     = require('jsonwebtoken');
const db      = require('../db/pool');

function getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw new Error('Twilio credentials not configured');
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function verifySid() {
  if (!process.env.TWILIO_VERIFY_SID) throw new Error('TWILIO_VERIFY_SID not set');
  return process.env.TWILIO_VERIFY_SID;
}

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return raw;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

router.post('/send', async (req, res) => {
  const raw = req.body?.phone;
  if (!raw) return res.status(400).json({ error: 'phone required' });
  const phone = normalizePhone(raw);
  if (!phone) return res.status(400).json({ error: 'Invalid phone — use E.164 or 10-digit US' });
  try {
    const client = getClient();
    await client.verify.v2.services(verifySid()).verifications.create({ to: phone, channel: 'sms' });
    res.json({ success: true, phone });
  } catch (err) {
    console.error('[otp/send]', err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/verify', async (req, res) => {
  const { phone: raw, code } = req.body;
  if (!raw || !code) return res.status(400).json({ error: 'phone and code required' });
  const phone = normalizePhone(raw);
  if (!phone) return res.status(400).json({ error: 'Invalid phone number' });
  if (!/^\d{4,10}$/.test(code)) return res.status(400).json({ error: 'Invalid code format' });
  try {
    const client = getClient();
    const check  = await client.verify.v2.services(verifySid()).verificationChecks.create({ to: phone, code });
    if (check.status !== 'approved') return res.status(401).json({ error: 'Invalid or expired code' });
    const { rows } = await db.query(
      `INSERT INTO users (phone, created_at, last_active_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (phone)
       DO UPDATE SET last_active_at = NOW()
       RETURNING id, phone, display_name, gender, age, is_verified, is_premium, (xmax = 0) AS is_new`,
      [phone]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, phone: user.phone, displayName: user.display_name, gender: user.gender, age: user.age, isVerified: user.is_verified, isPremium: user.is_premium, isNew: user.is_new },
    });
  } catch (err) {
    console.error('[otp/verify]', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
