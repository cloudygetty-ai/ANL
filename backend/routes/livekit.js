// backend/routes/livekit.js
// Issues short-lived LiveKit access tokens for video calls
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { AccessToken } = require('livekit-server-sdk');

router.post('/token', auth, async (req, res) => {
  const { roomName, participantName } = req.body;
  if (!roomName) return res.status(400).json({ error: 'roomName required' });

  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return res.status(503).json({ error: 'LiveKit not configured' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName || String(req.user.id),
      ttl: '1h',
    });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.json({ token, wsUrl: process.env.LIVEKIT_WS_URL });
  } catch (e) {
    console.error('[livekit/token]', e.message);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
