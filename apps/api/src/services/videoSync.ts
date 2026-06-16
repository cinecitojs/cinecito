import { FastifyInstance } from 'fastify';
import { setRoomSession, getRoomSession } from './roomSession';

export async function applyVideoCommand(fastify: FastifyInstance, roomId: string, command: any) {
  const patch: any = {};
  if (command.type === 'play') patch.isPlaying = true;
  if (command.type === 'pause') patch.isPlaying = false;
  if (command.seekTime !== undefined) patch.currentTime = command.seekTime;
  if (command.videoId !== undefined) patch.currentVideoId = command.videoId;

  const next = await setRoomSession(roomId, patch);
  fastify.io?.to(roomId).emit('room-state', { session: next, serverTime: Date.now() });
  return next;
}
