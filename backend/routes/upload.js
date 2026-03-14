// routes/upload.js
const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { upload, getPresignedUploadUrl, deleteObject, processAndUploadImage } = require('../services/s3');
const { moderateImage } = require('../services/moderation');

// ─── DIRECT UPLOAD (server processes file) ────────────────────
router.post('/photo', auth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const url = req.file.location; // multer-s3 sets this
    const key = req.file.key;

    // Async moderation (don't block response)
    moderateImage(url).then(async (result) => {
      if (!result.safe) {
        await deleteObject(key);
        await db.query(
          `INSERT INTO moderation_queue (user_id, photo_url, reason, status)
           VALUES ($1, $2, $3, 'flagged')`,
          [req.user.id, url, result.reason]
        );
      }
    }).catch(console.error);

    // Save to user photos
    const { rows } = await db.query(
      `INSERT INTO user_photos (user_id, url, s3_key, is_primary, position)
       VALUES ($1, $2, $3, (SELECT COUNT(*) = 0 FROM user_photos WHERE user_id = $1), 
               (SELECT COALESCE(MAX(position), -1) + 1 FROM user_photos WHERE user_id = $1))
       RETURNING *`,
      [req.user.id, url, key]
    );

    res.json({ photo: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRESIGNED URL (client uploads directly to S3) ────────────
router.post('/presign', auth, async (req, res) => {
  const { fileType, folder = 'photos' } = req.body;
  try {
    const result = await getPresignedUploadUrl(req.user.id, fileType, folder);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONFIRM PRESIGNED UPLOAD ─────────────────────────────────
router.post('/confirm', auth, async (req, res) => {
  const { key, url } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO user_photos (user_id, url, s3_key, is_primary, position)
       VALUES ($1, $2, $3,
               (SELECT COUNT(*) = 0 FROM user_photos WHERE user_id = $1),
               (SELECT COALESCE(MAX(position), -1) + 1 FROM user_photos WHERE user_id = $1))
       RETURNING *`,
      [req.user.id, url, key]
    );
    res.json({ photo: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE PHOTO ─────────────────────────────────────────────
router.delete('/photo/:photoId', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM user_photos WHERE id = $1 AND user_id = $2 RETURNING s3_key`,
      [req.params.photoId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Photo not found' });

    await deleteObject(rows[0].s3_key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REORDER PHOTOS ───────────────────────────────────────────
router.put('/photos/reorder', auth, async (req, res) => {
  const { order } = req.body; // [{ id, position }]
  try {
    await Promise.all(
      order.map(({ id, position }) =>
        db.query(
          `UPDATE user_photos SET position = $1, is_primary = ($1 = 0)
           WHERE id = $2 AND user_id = $3`,
          [position, id, req.user.id]
        )
      )
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
