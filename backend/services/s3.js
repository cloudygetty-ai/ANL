// services/s3.js
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');
const path = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;
const CDN = process.env.CLOUDFRONT_URL; // optional CDN prefix

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;

// ─── MULTER CONFIG (direct S3 stream) ─────────────────────────
const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const isVideo = file.mimetype.startsWith('video/');
      const folder = isVideo ? 'videos' : 'photos';
      const ext = path.extname(file.originalname) || (isVideo ? '.mp4' : '.jpg');
      cb(null, `${folder}/${req.user.id}/${uuid()}${ext}`);
    },
    metadata: (req, file, cb) => {
      cb(null, { userId: req.user.id, originalName: file.originalname });
    },
  }),
  limits: {
    fileSize: MAX_VIDEO_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

// ─── PRESIGNED UPLOAD URL (client-side direct upload) ─────────
async function getPresignedUploadUrl(userId, fileType, folder = 'photos') {
  const ext = fileType === 'video/mp4' ? '.mp4' : '.jpg';
  const key = `${folder}/${userId}/${uuid()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: fileType,
    Metadata: { userId },
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return { url, key, publicUrl: buildUrl(key) };
}

// ─── PRESIGNED DOWNLOAD URL (private files) ───────────────────
async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

// ─── DELETE OBJECT ────────────────────────────────────────────
async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ─── PROCESS + OPTIMIZE IMAGE (server-side) ───────────────────
async function processAndUploadImage(buffer, userId, options = {}) {
  const {
    width = 800,
    height = 800,
    quality = 85,
    folder = 'photos',
  } = options;

  const processed = await sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .jpeg({ quality })
    .toBuffer();

  const key = `${folder}/${userId}/${uuid()}.jpg`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: processed,
      ContentType: 'image/jpeg',
      Metadata: { userId },
    })
  );

  return { key, url: buildUrl(key), size: processed.length };
}

// ─── BUILD PUBLIC URL ─────────────────────────────────────────
function buildUrl(key) {
  if (CDN) return `${CDN}/${key}`;
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

module.exports = {
  upload,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteObject,
  processAndUploadImage,
  buildUrl,
};
