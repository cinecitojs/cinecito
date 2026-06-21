import { describe, it, expect } from 'vitest';
import {
  createInvite, inviteStatus, consumeInvite, revokeInvite, listInvites, deleteRoomInvites,
} from '../inviteStore';

describe('inviteStore', () => {
  it('crea, valida y consume usos hasta el límite', () => {
    const inv = createInvite('room-A', { maxUses: 2 });
    expect(inviteStatus(inv.code).valid).toBe(true);
    expect(consumeInvite(inv.code)).not.toBeNull(); // uso 1
    expect(consumeInvite(inv.code)).not.toBeNull(); // uso 2
    expect(inviteStatus(inv.code)).toMatchObject({ valid: false, reason: 'max_uses' });
    expect(consumeInvite(inv.code)).toBeNull();
  });

  it('expira por tiempo', () => {
    const inv = createInvite('room-B', { ttlSeconds: -1 }); // ya vencida
    expect(inviteStatus(inv.code)).toMatchObject({ valid: false, reason: 'expired' });
  });

  it('revoca', () => {
    const inv = createInvite('room-C', {});
    expect(revokeInvite('room-C', inv.code)).toBe(true);
    expect(inviteStatus(inv.code)).toMatchObject({ valid: false, reason: 'revoked' });
    // no revoca si el roomId no coincide
    const other = createInvite('room-C2', {});
    expect(revokeInvite('room-X', other.code)).toBe(false);
  });

  it('lista y borra por sala', () => {
    deleteRoomInvites('room-D');
    createInvite('room-D', {});
    createInvite('room-D', {});
    expect(listInvites('room-D').length).toBe(2);
    deleteRoomInvites('room-D');
    expect(listInvites('room-D').length).toBe(0);
  });

  it('código inexistente → not_found', () => {
    expect(inviteStatus('ZZZZZZZZ')).toMatchObject({ valid: false, reason: 'not_found' });
  });
});
