# Cinecito 2.0

Monorepo for Cinecito 2.0

## Ejecutar tests localmente

- Requisitos mínimos:
	- Node.js (v16+ recomendado) y `npm`.
	- Instalar dependencias desde la raíz o desde `apps/api`:

```bash
npm install
# o solo las deps del servicio API:
npm --prefix ./apps/api install
```

- Variables de entorno mínimas para ejecutar la suite de tests del API:
	- `JWT_SECRET`: secreto JWT (por ejemplo `testsecret`). Obligatorio.
	- `NODE_ENV`: se recomienda `test` para que el entorno use stubs y mocks.
	- `REDIS_URL`: no es necesario para la suite de tests (cuando `NODE_ENV=test` Redis se simula), pero puede definirse si quieres probar el adapter de Redis.

- Comandos de ejemplo:

PowerShell (Windows):
```powershell
$env:JWT_SECRET='testsecret'
$env:NODE_ENV='test'
npm --prefix ./apps/api test
```

Linux / macOS:
```bash
JWT_SECRET=testsecret NODE_ENV=test npm --prefix ./apps/api test
```

- Notas:
	- La suite de tests del API usa un mock sencillo de Prisma y evita conexiones reales a Redis cuando `NODE_ENV=test`.
	- Si quieres ejecutar la aplicación completa (no solo tests), necesitas definir variables adicionales como `DATABASE_URL`, `REDIS_URL`, `R2_*` y `FRONTEND_URL`. Consulta `apps/api/src/lib/env.ts` para la lista completa de variables esperadas en producción.

