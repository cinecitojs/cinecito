Inventario de artefactos creados/modificados durante la auditoría

Archivos modificados:
- apps/api/src/sockets/socket.ts (P0.2: validación membership + ACK/fallback)
- apps/api/src/modules/rooms/routes.ts (P0.1: validaciones de ownership/join)
- apps/api/src/modules/messages/routes.ts (validación membership antes de persistir)
- apps/api/src/modules/uploads/routes.ts (P0.4: auth + whitelist + presigned key)
- apps/api/src/uploads/r2.ts (TTL reducido a 300s)
- apps/api/src/modules/auth/routes.ts (zod validation + hashing)

Archivos añadidos / scripts:
- scripts/check_redis_ping.js
- scripts/get_health.js
- scripts/register_user.js
- scripts/create_room.js
- scripts/add_room_member_prisma.js
- scripts/get_messages.js
- scripts/socket_client_with_ack.js
- scripts/socket_client_no_ack.js
- scripts/socket_client_no_ack_invalid.js

Tests añadidos:
- apps/api/src/tests/uploads.test.ts

Patches / registros:
- p0_fixes.patch (patch aplicado con las correcciones P0)

Notas:
- No se realizaron cambios en Prisma schema ni migraciones.
- No se actualizó el árbol de dependencias.
- conservar scripts para evidencias; no eliminar.
