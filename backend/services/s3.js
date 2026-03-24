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

const BUCKET = process.env.AWS_S3_BUCKET;
const CDN = process.env.CLOUDFRONT_URL;

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_VIDEO_MB = 50;

let _s3;
function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3;
}

let _upload;
function getUpload() {
  if (!_upload) {
    _upload = multer({
      storage: multerS3({
        s3: getS3(),
        bucket: BUCKET || 'placeholder',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const isVideo = file.mimetype.startsWith('video/');
          const folder = isVideo ? 'videos' : 'photos';
          const ext = path.extname(file.originalname) || (isVideo ? '.mp4' : '.jpg');
          cb(null, folder + '/' + req.user.id + '/' + uuid() + ext);
        },
        metadata: (req, file, cb) => {
          cb(null, { userId: req.user.id, originalName: file.originalname });
        },
      }),
      limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Unsupported file type: ' + file.mimetype));
      },
    });
  }
  return _upload;
}

const upload = new Proxy({}, {
  get(_, prop) { return getUpload()[prop]; }
});

async function getPresignedUploadUrl(userId, fileType, folder) {
  folder = folder || 'photos';
  const ext = fileType === 'video/mp4' ? '.mp4' : '.jpg';
  const key = folder + '/' + userId + '/' + uuid() + ext;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: fileType, Metadata: { userId: userId } });
  const url = await getSignedUrl(getS3(), command, { expiresIn: 300 });
  return { url: url, key: key, publicUrl: buildUrl(key) };
}

async function getPresignedDownloadUrl(key, expiresIn) {
  expiresIn = expiresIn || 3600;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(getS3(), command, { expiresIn: expiresIn });
}

async function deleteObject(key) {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function processAndUploadImage(buffer, userId, options) {
  options = options || {};
  const width = options.width || 800;
  const height = options.height || 800;
  const quality = options.quality || 85;
  const folder = options.folder || 'photos';
  const processed = await sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: quality })
    .toBuffer();
  const key = folder + '/' + userId + '/' + uuid() + '.jpg';
  await getS3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: processed, ContentType: 'image/jpeg', Metadata: { userId: userId } }));
  return { key: key, url: buildUrl(key), size: processed.length };
}

function buildUrl(key) {
  if (CDN) return CDN + '/' + key;
  return 'https://' + BUCKET + '.s3.' + (process.env.AWS_REGION || 'us-east-1') + '.amazonaws.com/' + key;
}

module.exports = { upload, getPresignedUploadUrl, getPresignedDownloadUrl, deleteObject, processAndUploadImage, buildUrl };
