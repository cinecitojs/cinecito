import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../../middlewares/auth';

const ALLOWED_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const router: FastifyPluginAsync = async (fastify) => {
  // Initialize upload - server generates key and returns presigned URL
  fastify.post('/init', { preHandler: authMiddleware }, async (request, reply) => {
    const { contentType } = (request.body as any) || {};
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return reply.status(400).send({ error: 'Invalid or missing contentType' });
    }

    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const ext = contentType === 'video/mp4' ? 'mp4' : contentType === 'video/webm' ? 'webm' : 'ogg';
    const uploadKey = `uploads/${userId}/${randomUUID()}.${ext}`;

    const presigned = await import('../../uploads/r2').then((m) => m.generatePresignedUpload(uploadKey, contentType, 300));
    return presigned;
  });

  // Complete upload: confirm and optionally persist metadata
  fastify.post('/complete', { preHandler: authMiddleware }, async (request, reply) => {
    const { key } = (request.body as any) || {};
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!key || typeof key !== 'string' || !key.startsWith(`uploads/${userId}/`)) {
      return reply.status(403).send({ error: 'Forbidden or invalid key' });
    }

    // TODO: verify object exists in R2 if needed and persist metadata
    return { ok: true };
  });
};

export default router;
