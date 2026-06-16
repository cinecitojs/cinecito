import fp from 'fastify-plugin';
import { Server as IOServer } from 'socket.io';
import { logger } from '../lib/logger';
import jwt from 'jsonwebtoken';
import { createRedisAdapter } from './adapter';
import { attachSignaling } from '../webrtc/signaling';
import { redis } from '../lib/redis';
import { prisma } from '../lib/db';
import { isMemberOrOwner } from '../lib/acl';

export default fp(async function (fastify, _opts) {
  const io = new IOServer(fastify.server, { cors: { origin: process.env.FRONTEND_URL || '*' } });

  // attach redis adapter (optional in dev if Redis is unavailable)
  try {
    const adapter = await createRedisAdapter(process.env.REDIS_URL as string);
    if (adapter) {
      io.adapter(adapter);
    } else {
      logger.info('Redis adapter not applied (no adapter returned)');
    }
  } catch (err: any) {
    logger.error({ err }, 'Failed to apply Redis adapter');
  }

  // authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
      (socket as any).data.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  attachSignaling(io);

  io.on('connection', (socket) => {
    logger.info('socket connected', { id: socket.id });

    const userId = (socket as any).data.userId;
    if (userId) redis.sadd(`presence:${userId}`, socket.id);

    socket.on('join-room', async (data, ack) => {
      try {
        const { roomId } = (data as any) || {};
        if (!roomId) {
          const payload = { error: 'invalid_payload', message: 'roomId required' };
          if (typeof ack === 'function') return ack(payload);
          return socket.emit('join-error', payload);
        }

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
          const payload = { error: 'not_found', message: 'Room not found' };
          if (typeof ack === 'function') return ack(payload);
          return socket.emit('join-error', payload);
        }

        if (room.isPrivate) {
          const userId = (socket as any).data.userId as string | undefined;
          const allowed = await isMemberOrOwner(roomId, userId);
          if (!allowed) {
            const payload = userId ? { error: 'forbidden', message: 'Not a member of this private room' } : { error: 'unauthorized', message: 'Authentication required' };
            if (typeof ack === 'function') return ack(payload);
            return socket.emit('join-error', payload);
          }
        }

        socket.join(roomId);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err: any) {
        logger.error({ err }, 'join-room failed');
        const payload = { error: 'internal', message: 'Internal server error' };
        if (typeof (arguments[1]) === 'function') return (arguments[1] as Function)(payload);
        return socket.emit('join-error', payload);
      }
    });

    socket.on('leave-room', (data) => {
      const { roomId } = data;
      socket.leave(roomId);
    });

    socket.on('send-message', async (data, ack) => {
      try {
        const { roomId, content } = (data as any) || {};
        if (!roomId || !content) {
          const payload = { error: 'invalid_payload', message: 'roomId and content required' };
          if (typeof ack === 'function') return ack(payload);
          return socket.emit('message-error', payload);
        }

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
          const payload = { error: 'not_found', message: 'Room not found' };
          if (typeof ack === 'function') return ack(payload);
          return socket.emit('message-error', payload);
        }

        if (room.isPrivate) {
          const userId = (socket as any).data.userId as string | undefined;
          const allowed = await isMemberOrOwner(roomId, userId);
          if (!allowed) {
            const payload = userId ? { error: 'forbidden', message: 'Not a member of this private room' } : { error: 'unauthorized', message: 'Authentication required' };
            if (typeof ack === 'function') return ack(payload);
            return socket.emit('message-error', payload);
          }
        }

        const userId = (socket as any).data.userId || null;
        const saved = await prisma.message.create({ data: { roomId, userId, content } });
        io.to(roomId).emit('message', saved);
        if (typeof ack === 'function') ack({ ok: true, message: saved });
      } catch (err: any) {
        logger.error({ err }, 'failed to persist message');
        const payload = { error: 'internal', message: 'Internal server error' };
        if (typeof ack === 'function') return ack(payload);
        return socket.emit('message-error', payload);
      }
    });

    socket.on('disconnect', () => {
      if (userId) redis.srem(`presence:${userId}`, socket.id);
    });
  });

  fastify.addHook('onClose', async () => {
    io.close();
    try {
      await redis.quit();
    } catch (err: any) {
      logger.error({ err }, 'Error while quitting Redis on close');
    }
  });

  fastify.decorate('io', io);
});
