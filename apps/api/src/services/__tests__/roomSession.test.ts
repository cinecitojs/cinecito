import { describe, it, expect } from 'vitest';
import { getRoomSession, setRoomSession, deleteRoomSession } from '../roomSession';

// En NODE_ENV=test el cliente Redis es un stub (live=false) → se usa el
// fallback en memoria, igual que en un servidor sin REDIS_URL.
describe('roomSession persiste sin Redis (memoria)', () => {
  it('preserva currentVideoId entre comandos (regresión: el video desaparecía al Play)', async () => {
    const room = 'room-test-vid';
    await deleteRoomSession(room);

    // SELECT: se elige el video
    let s = await setRoomSession(room, { currentVideoId: 'vid-1', currentTime: 0, isPlaying: false });
    expect(s.currentVideoId).toBe('vid-1');

    // PLAY: el patch NO incluye currentVideoId → debe preservarse
    s = await setRoomSession(room, { isPlaying: true, currentTime: 0 });
    expect(s.currentVideoId).toBe('vid-1'); // ← antes volvía a null y el cliente borraba el video
    expect(s.isPlaying).toBe(true);

    // SEEK: sigue preservando
    s = await setRoomSession(room, { currentTime: 42 });
    expect(s.currentVideoId).toBe('vid-1');
    expect(s.currentTime).toBe(42);

    // get directo
    const got = await getRoomSession(room);
    expect(got?.currentVideoId).toBe('vid-1');

    await deleteRoomSession(room);
    expect(await getRoomSession(room)).toBeNull();
  });
});
