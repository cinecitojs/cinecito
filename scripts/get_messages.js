const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const roomId = process.argv[2];
if (!roomId) { console.error('usage: node get_messages.js <roomId>'); process.exit(2); }
(async () => {
  try {
    const msgs = await prisma.message.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } });
    console.log(JSON.stringify(msgs, null, 2));
  } catch (err) {
    console.error('prisma error', err && err.message ? err.message : err);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
})();
