// backend/routes/ice.js
// Called by RN client before initiating any video call
// Returns time-limited TURN credentials

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { generateTurnCredentials } = require('../services/turn');

// GET /api/ice/config
// Returns ICE server config with short-lived TURN credentials
router.get('/config', auth, (req, res) => {
  const config = generateTurnCredentials(req.user.id);
  res.json(config);
});

module.exports = router;
