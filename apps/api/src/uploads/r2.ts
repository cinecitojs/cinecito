import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
  forcePathStyle: false,
});

const CONTENT_TYPE_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogg',
};

const ALLOWED_CONTENT_TYPES = new Set(Object.keys(CONTENT_TYPE_EXT));

export async function generatePresignedUpload(keyOrPath: string, contentType = 'video/mp4', expiresIn = 300) {
  const bucket = process.env.R2_BUCKET_NAME as string;
  if (!bucket) throw new Error('R2 bucket not configured');

  // If caller passed a full key, ensure it doesn't already exist
  try {
    const head = new HeadObjectCommand({ Bucket: bucket, Key: keyOrPath });
    await s3.send(head);
    // If Head succeeds, object exists -> prevent overwrite
    throw new Error('Object already exists');
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode || err?.statusCode;
    if (status && status !== 404) {
      // Unexpected error
      throw err;
    }
    // status 404 or NotFound -> proceed to generate presigned
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error('Invalid contentType');

  const command = new PutObjectCommand({ Bucket: bucket, Key: keyOrPath, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl: url, key: keyOrPath };
}
