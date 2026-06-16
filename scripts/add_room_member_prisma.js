const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const roomId = process.argv[2];
const userId = process.argv[3];
const displayName = process.argv[4] || 'member';
if (!roomId || !userId) { console.error('usage: node add_room_member_prisma.js <roomId> <userId> [displayName]'); process.exit(2); }
(async () => {
  try {
    const member = await prisma.roomMember.create({ data: { roomId, userId, displayName } });
    console.log(JSON.stringify(member, null, 2));
  } catch (err) {
    console.error('prisma error', err && err.message ? err.message : err);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
})();
