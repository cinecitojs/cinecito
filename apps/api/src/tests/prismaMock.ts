export function createPrismaMock() {
  const users: any[] = [];
  const rooms: any[] = [];
  const members: any[] = [];
  const messages: any[] = [];

  function nowIso() { return new Date().toISOString(); }
  function id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

  return {
    // user delegate
    user: {
      create: async ({ data }: any) => {
        const u = { id: id(), email: data.email, username: data.username, password: data.password, role: data.role ?? 'USER', createdAt: nowIso(), updatedAt: nowIso() };
        users.push(u);
        return u;
      },
      findFirst: async ({ where }: any) => {
        if (!where) return null;
        if (where.email) return users.find(u => u.email === where.email) ?? null;
        return users.find(u => Object.keys(where).every(k => (u as any)[k] === where[k])) ?? null;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return users.find(u => u.id === where.id) ?? null;
        return null;
      }
    },
    // room delegate
    room: {
      create: async ({ data }: any) => {
        const room = { id: id(), code: data.code ?? Math.random().toString(36).substring(2,8).toUpperCase(), name: data.name, ownerId: data.ownerId ?? null, isPrivate: data.isPrivate ?? true, currentVideoId: data.currentVideoId ?? null, createdAt: nowIso(), updatedAt: nowIso() };
        rooms.push(room);
        return room;
      },
      findUnique: async ({ where, include }: any) => {
        const r = where.id ? rooms.find(x => x.id === where.id) : where.code ? rooms.find(x => x.code === where.code) : null;
        if (!r) return null;
        if (include && include.members) {
          const roomMembers = members.filter(m => m.roomId === r.id);
          return { ...r, members: roomMembers };
        }
        return r;
      },
      update: async ({ where, data }: any) => {
        const idx = rooms.findIndex(r => r.id === where.id);
        if (idx === -1) return null;
        rooms[idx] = { ...rooms[idx], ...data, updatedAt: nowIso() };
        return rooms[idx];
      },
      delete: async ({ where }: any) => {
        const idx = rooms.findIndex(r => r.id === where.id);
        if (idx === -1) return null;
        const [del] = rooms.splice(idx, 1);
        return del;
      }
    },
    roomMember: {
      create: async ({ data }: any) => {
        const m = { id: id(), roomId: data.roomId, userId: data.userId ?? null, displayName: data.displayName, isHost: data.isHost ?? false, joinedAt: nowIso() };
        members.push(m);
        return m;
      },
      findFirst: async ({ where }: any) => {
        return members.find(m => Object.keys(where).every(k => (m as any)[k] === where[k])) ?? null;
      }
    },
    message: {
      create: async ({ data }: any) => {
        const msg = { id: id(), roomId: data.roomId, userId: data.userId ?? null, content: data.content, createdAt: nowIso() };
        messages.push(msg);
        return msg;
      },
      findMany: async ({ where, orderBy, take, skip }: any) => {
        let res = messages.filter(m => m.roomId === where.roomId);
        // sort by createdAt desc
        res = res.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        if (typeof skip === 'number') res = res.slice(skip);
        if (typeof take === 'number') res = res.slice(0, take);
        return res;
      }
    },

    // expose for tests
    __internal: { users, rooms, members, messages }
  };
}
