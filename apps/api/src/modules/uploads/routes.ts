// ============================================================
// apps/api/src/modules/uploads/routes.ts
// Videos de la sala: subida (R2, opcional) + URLs externas
// (YouTube / Vimeo / Dailymotion / PeerTube / Archive.org / HLS / MP4)
// con detección de fuente, validación (incl. resolución remota de
// Archive.org) y permisos unificados (addVideo / removeVideo).
// ============================================================

import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../../middlewares/auth';
import { prisma } from '../../lib/db';
import { canDoVideoAction } from '../../lib/permissions';
import { resolveVideoSourceAsync, defaultTitle } from '../../lib/videoSource';
import { uploadsEnabled } from '../../../config/env';

const ALLOWED_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const router: FastifyPluginAsync = async (fastify) => {

  // Helper: validar acceso + permiso de agregar video
  async function assertCanAdd(request: any, reply: any, roomId: string) {
    const userId = request.user?.id;
    if (!userId) { reply.status(401).send({ error: 'Unauthorized' }); return false; }
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) { reply.status(404).send({ error: 'Room not found' }); return false; }
    if (!(await canDoVideoAction(roomId, userId, 'addVideo'))) {
      reply.status(403).send({ error: 'No tenés permiso para agregar videos' });
      return false;
    }
    return true;
  }

  // ── POST /init — Iniciar subida (presigned URL) ──────────
  fastify.post('/init', { preHandler: authMiddleware }, async (request, reply) => {
    if (!uploadsEnabled) {
      return reply.status(503).send({ error: 'La subida de archivos no está disponible en este servidor. Usá una URL de YouTube, Vimeo, HLS o MP4.' });
    }
    const { contentType } = (request.body as any) || {};
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return reply.status(400).send({ error: 'contentType inválido. Permitidos: video/mp4, video/webm, video/ogg' });
    }
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const ext = contentType === 'video/mp4' ? 'mp4' : contentType === 'video/webm' ? 'webm' : 'ogg';
    const uploadKey = `uploads/${userId}/${randomUUID()}.${ext}`;
    try {
      const { generatePresignedUpload } = await import('../../uploads/r2');
      const presigned = await generatePresignedUpload(uploadKey, contentType, 300);
      return reply.send(presigned);
    } catch (err: any) {
      fastify.log.error(err, 'Failed to generate presigned URL');
      return reply.status(500).send({ error: 'Failed to generate upload URL' });
    }
  });

  // ── POST /complete — Confirmar subida y guardar metadata ─
  fastify.post('/complete', { preHandler: authMiddleware }, async (request, reply) => {
    const { key, roomId, title } = (request.body as any) || {};
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!key || typeof key !== 'string' || !key.startsWith(`uploads/${userId}/`)) {
      return reply.status(403).send({ error: 'Forbidden or invalid key' });
    }
    if (!roomId) return reply.status(400).send({ error: 'roomId required' });
    if (!(await assertCanAdd(request, reply, roomId))) return;

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`;

    const video = await prisma.videoMeta.create({
      data: { roomId, source: 'upload', url: publicUrl, title: title?.trim() || key.split('/').pop() || 'Video' },
    });
    (fastify as any).io?.to(roomId).emit('video-added', { video });
    return reply.status(201).send({ ok: true, video });
  });

  // ── POST /url — Agregar cualquier URL externa (detecta fuente) ──
  // Reemplaza/unifica los antiguos /youtube y /direct.
  fastify.post('/url', { preHandler: authMiddleware }, async (request, reply) => {
    const { roomId, url, title } = (request.body as any) || {};
    if (!roomId || !url) return reply.status(400).send({ error: 'roomId and url required' });

    const resolved = await resolveVideoSourceAsync(String(url));
    if (!resolved.valid) return reply.status(400).send({ error: resolved.error || 'El enlace no es válido o no es compatible.' });
    if (!(await assertCanAdd(request, reply, roomId))) return;

    const video = await prisma.videoMeta.create({
      data: { roomId, source: resolved.source, url: resolved.url, title: title?.trim() || defaultTitle(resolved.source) },
    });
    (fastify as any).io?.to(roomId).emit('video-added', { video });
    return reply.status(201).send({ ok: true, video });
  });

  // ── Compatibilidad: /youtube y /direct delegan en la detección ──
  const legacyAdd = async (request: any, reply: any) => {
    const { roomId, url, title } = (request.body as any) || {};
    if (!roomId || !url) return reply.status(400).send({ error: 'roomId and url required' });
    const resolved = await resolveVideoSourceAsync(String(url));
    if (!resolved.valid) return reply.status(400).send({ error: resolved.error || 'Enlace inválido' });
    if (!(await assertCanAdd(request, reply, roomId))) return;
    const video = await prisma.videoMeta.create({
      data: { roomId, source: resolved.source, url: resolved.url, title: title?.trim() || defaultTitle(resolved.source) },
    });
    (request.server as any).io?.to(roomId).emit('video-added', { video });
    return reply.status(201).send({ ok: true, video });
  };
  fastify.post('/youtube', { preHandler: authMiddleware }, legacyAdd);
  fastify.post('/direct',  { preHandler: authMiddleware }, legacyAdd);

  // ── DELETE /:videoId — Eliminar video (permiso removeVideo) ──
  fastify.delete('/:videoId', { preHandler: authMiddleware }, async (request, reply) => {
    const { videoId } = request.params as any;
    const userId = (request as any).user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const video = await prisma.videoMeta.findUnique({ where: { id: videoId } });
    if (!video) return reply.status(404).send({ error: 'Video not found' });

    if (!(await canDoVideoAction(video.roomId, userId, 'removeVideo'))) {
      return reply.status(403).send({ error: 'No tenés permiso para eliminar videos' });
    }
    await prisma.videoMeta.delete({ where: { id: videoId } });
    (fastify as any).io?.to(video.roomId).emit('video-removed', { videoId });
    return reply.send({ ok: true });
  });
};

export default router;
