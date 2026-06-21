// ============================================================
// apps/api/src/jobs/makeAdmin.cli.ts
// Promueve un usuario a ADMIN por email o nombre de usuario.
//
//   Dev/manual:  npm run make-admin -- <email|usuario>
//   Prod:        node dist/jobs/makeAdmin.cli.js <email|usuario>
//
// Alternativa sin script: poné el email en ADMIN_EMAILS (.env) y se promueve al
// iniciar sesión. Útil también tras desplegar en Render (variable de entorno).
// ============================================================

import '../../config/env';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';

async function main() {
  const arg = process.argv[2]?.trim();
  if (!arg) {
    logger.error('Uso: npm run make-admin -- <email|usuario>');
    process.exitCode = 1;
    return;
  }

  const isEmail = /^\S+@\S+\.\S+$/.test(arg);
  const user = await prisma.user.findFirst({
    where: isEmail ? { email: arg } : { username: arg, isGuest: false },
    select: { id: true, username: true, email: true, role: true },
  });

  if (!user) {
    logger.error({ arg }, 'make-admin: no se encontró el usuario');
    process.exitCode = 1;
    return;
  }
  if (user.role === 'ADMIN') {
    logger.info({ user: user.username }, 'make-admin: ya era ADMIN');
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  logger.info({ user: user.username, email: user.email }, 'make-admin: promovido a ADMIN ✅');
}

main()
  .catch((err) => {
    logger.error({ err }, 'make-admin: falló');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
