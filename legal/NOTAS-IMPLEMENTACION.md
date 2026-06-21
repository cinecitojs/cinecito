# Notas de implementación para el equipo técnico

Guía para llevar los documentos legales a producción dentro de Cinecito (React 18 + Vite + Fastify +
Prisma). **Orden sugerido** y dónde encaja cada cosa en el código actual.

---

## 1. Servir las páginas legales

- Crear una carpeta de contenido (estos `.md`) y renderizarla, o crear páginas React simples.
- Añadir rutas en `apps/web/src/app/App.tsx` bajo `/legal/*` (públicas, no protegidas).
- Añadir enlaces en:
  - **Footer** del layout (`AppLayout.tsx`).
  - **Registro** (`Register.tsx`) junto a la casilla de aceptación.
  - **Ajustes** (`Settings.tsx`) → nueva subsección «Legal» dentro de Privacidad o Cuenta.

## 2. Casilla de aceptación en el registro

- En `Register.tsx`: casilla **obligatoria** que bloquea el botón hasta marcarse.
- En el backend (`apps/api/src/modules/auth/routes.ts`), al registrar, persistir la aceptación
  (`LegalAcceptance`: userId, docType, docVersion, ts, ip). Requiere migración Prisma aditiva.
- Versionar los documentos (`docVersion`) para re‑solicitar aceptación tras cambios sustanciales.

## 3. Banner de cookies

- Componente cliente que aparece en el primer acceso; persistir elección en `localStorage`
  (`cinecito_cookie_consent`) **y** opcionalmente en backend para usuarios autenticados.
- No cargar analítica/no esenciales hasta que el usuario acepte. Hoy no hay analítica → el banner
  puede usar la **versión mínima** (solo técnicas) del documento 7.

## 4. Moderación y denuncias (primera versión)

- Modelo `Report` (ver documento 11) — migración aditiva, alineada con el patrón actual de stores.
- Botón «Reportar» en sala/mensaje/perfil → endpoint que crea el `Report`.
- Reutilizar el patrón **`requireAdmin`** ya propuesto para la cuenta Admin: la bandeja de moderación
  vive en el módulo `/admin` y consume `Report` + acciones de sanción (documento 8).
- El flujo de **takedown** de copyright puede empezar como buzón de correo + registro manual de casos,
  y luego integrarse en la bandeja.

## 5. Retención y borrado

- Job programado (cron) de **purga/anonimización** de logs y datos según los plazos del documento 11.
- **Borrado de cuenta**: asegurar que elimina/anonimiza datos del usuario y sus salas (ya existe el
  patrón de borrado de salas del usuario en limpieza de pruebas).
- **Exportación de datos** (portabilidad): endpoint autenticado que devuelva los datos del usuario.

## 6. Permisos y trazabilidad (ya parcialmente implementado)

- Mantener la validación **server‑authoritative** existente (`canDoVideoAction`, control por rol en
  sockets, anfitrión‑only en solicitudes de acceso).
- Extender la **trazabilidad** a moderación/sanciones/denuncias (autor, acción, objeto, ts).
- Conservar el **rate limiting** ya presente (`checkRate`) y aplicarlo también a `Report` y endpoints
  legales sensibles.

## 7. Dependencias de decisiones de negocio (bloqueantes)

Antes de publicar, el equipo necesita del operador:
1. Datos del titular y jurisdicción (rellenar placeholders).
2. Edad mínima definitiva.
3. Mecanismo de transferencia internacional (BD/hosting fuera de la UE → p. ej. Supabase US).
4. Arquitectura final de llamadas A/V (P2P vs servidor; grabación sí/no).
5. Contacto de copyright y de denuncias.

> Recordatorio: estos textos son plantillas; **no publicar sin revisión de un abogado** de `Paraguay`.
