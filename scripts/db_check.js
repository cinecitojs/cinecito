const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    console.log('users:', JSON.stringify(users, null, 2));

    const rooms = await prisma.room.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    console.log('rooms:', JSON.stringify(rooms, null, 2));

    const members = await prisma.roomMember.findMany({ orderBy: { joinedAt: 'desc' }, take: 5 });
    console.log('members:', JSON.stringify(members, null, 2));

    const messages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    console.log('messages:', JSON.stringify(messages, null, 2));

    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
