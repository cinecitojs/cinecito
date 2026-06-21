# Cinecito 🎬

Salas de cine virtuales para ver videos en sincronía con amigos: reproducción sincronizada (host como controlador), chat en tiempo real, reacciones, llamadas de voz, temas de sala y una capa de apoyo voluntario (Ko‑fi) con recompensas cosméticas. Mascota oficial: **Pochi**.

## Estructura (monorepo)

```
apps/
  api/   Backend — Fastify 4 + Prisma 5 + PostgreSQL (Supabase) + Socket.IO
  web/   Frontend — React 18 + Vite 5 + Tailwind + Zustand + React Query
legal/   Documentos legales (fuentes en Markdown)
vip/     Assets de recompensas (origen)
```

## Desarrollo local

Requisitos: Node 20, una base PostgreSQL (Supabase recomendado).

```bash
# API
cd apps/api
cp .env.example .env        # completar DATABASE_URL y JWT_SECRET
npm install
npm run prisma:push         # crea/actualiza el esquema en la base
npm run dev                 # http://localhost:4000

# Web (en otra terminal)
cd apps/web
npm install
npm run dev                 # http://localhost:5173
```

En LAN multidispositivo, dejá `VITE_API_URL` vacío: la web usa el mismo host desde el
que se abre. Para apuntar a un backend fijo, definí `VITE_API_URL`.

## Despliegue (Render)

El repo incluye un blueprint [`render.yaml`](render.yaml) que define dos servicios:

- **API** — Web Service (Node). Build con `prisma generate` + `tsc`; arranca `node dist/src/index.js`; health check en `/health`.
- **Web** — Static Site. Build con Vite; rewrite SPA `/* → /index.html`.

Variables de entorno requeridas y opcionales: ver [`apps/api/.env.example`](apps/api/.env.example) y [`apps/web/.env.example`](apps/web/.env.example). Los secretos se cargan en el panel de Render, nunca en el repositorio.

## Licencia

Proyecto privado de Cinecito.
