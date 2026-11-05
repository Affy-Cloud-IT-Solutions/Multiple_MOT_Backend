let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand;
try {
  ({ S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'));
} catch (e) {
  console.warn('[R2 Storage] @aws-sdk/client-s3 package is not installed. Cloudflare R2 will remain disabled.');
}
const path = require('path');

let s3ClientInstance = null;

/**
 * Check if Cloudflare R2 credentials are fully configured
 */
function isR2Configured() {
  return Boolean(
    Boolean(S3Client) &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID) &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Get or initialize the S3Client instance for Cloudflare R2
 */
function getR2Client() {
  if (!s3ClientInstance) {
    const endpoint = process.env.R2_ENDPOINT || 
      (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

    if (!endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('Cloudflare R2 is not configured properly in environment variables.');
    }

    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

/**
 * Upload a file buffer directly to Cloudflare R2
 * @param {Object} options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.filename - Object key in bucket
 * @param {string} options.mimetype - MIME type of the file
 * @returns {Promise<{ filename: string, etag?: string }>}
 */
async function uploadToR2({ buffer, filename, mimetype }) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME || 'ondoorcarservice';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const response = await client.send(command);
  return {
    filename,
    etag: response.ETag,
  };
}

/**
 * Get an object stream from Cloudflare R2
 * @param {string} filename - Object key in bucket
 * @returns {Promise<{ stream: any, contentType: string, contentLength: number }>}
 */
async function getFromR2(filename) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME || 'ondoorcarservice';

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
  });

  const response = await client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength,
  };
}

/**
 * Delete an object from Cloudflare R2
 * @param {string} filename - Object key in bucket
 */
async function deleteFromR2(filename) {
  if (!isR2Configured()) return;
  try {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || 'ondoorcarservice';
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: filename,
    });
    await client.send(command);
  } catch (err) {
    console.warn(`[R2 Warning] Could not delete "${filename}":`, err.message);
  }
}

/**
 * Build the full public URL for an uploaded file
 * If R2_PUBLIC_URL is configured (e.g. public bucket or custom domain), use that.
 * Otherwise, return the backend's /uploads/:filename endpoint which streams from R2.
 */
function resolveFileUrl(filename, req) {
  const publicBase = process.env.R2_PUBLIC_URL ? process.env.R2_PUBLIC_URL.trim().replace(/\/$/, '') : '';
  if (publicBase) {
    return `${publicBase}/${filename}`;
  }

  const host = req ? (req.get('host') || 'localhost:5000') : 'localhost:5000';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.0.2.2');
  const forwardedProto = req && req.headers ? req.headers['x-forwarded-proto'] : null;
  const protocol = isLocal ? (req ? req.protocol : 'http') : (forwardedProto || 'https');
  // Use /api/uploads because Nginx always proxies /api/ to the backend on live servers
  return `${protocol}://${host}/api/uploads/${filename}`;
}

module.exports = {
  isR2Configured,
  getR2Client,
  uploadToR2,
  getFromR2,
  deleteFromR2,
  resolveFileUrl,
};

