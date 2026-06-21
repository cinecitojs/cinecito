# Checklist técnica y de producto para desarrolladores

> Traduce los requisitos legales a tareas concretas de producto/backend para Cinecito. Marca cada
> punto antes del lanzamiento público.

---

## 1. Páginas legales necesarias (rutas)

Publicar y enlazar (footer + registro + ajustes) las siguientes rutas:

- [ ] `/legal/terminos` — Términos y Condiciones
- [ ] `/legal/privacidad` — Política de Privacidad
- [ ] `/legal/copyright` — Copyright / Notice & Takedown
- [ ] `/legal/aviso-legal` — Aviso Legal
- [ ] `/legal/cookies` — Política de Cookies
- [ ] `/legal/cuentas` — Suspensión y eliminación de cuentas
- [ ] `/legal/denuncias` — Procedimiento de denuncias
- [ ] `/legal/faq` — FAQ legal
- [ ] Enlaces visibles en **footer**, **registro** y **ajustes** (sección «Legal»).

## 2. Casillas de aceptación y consentimiento

- [ ] Registro: casilla **obligatoria** (Términos + Privacidad + edad ≥ `16`), **no premarcada**.
- [ ] Casillas opcionales separadas (marketing, cookies no esenciales) sin premarcar.
- [ ] Botón «Crear cuenta» bloqueado hasta aceptar la casilla obligatoria.
- [ ] Persistir prueba de aceptación: `userId`, `docType`, `docVersion`, `acceptedAt`, `ip`.
- [ ] Banner de cookies con **Aceptar / Rechazar** en igualdad; no cargar scripts no esenciales antes
      del consentimiento; permitir revocar.
- [ ] Versionar documentos legales y **re‑solicitar** aceptación ante cambios sustanciales.

### Esquema sugerido (aditivo, no rompe el modelo actual)
```prisma
model LegalAcceptance {
  id         String   @id @default(cuid())
  userId     String
  docType    String   // 'terms' | 'privacy' | 'cookies' | ...
  docVersion String
  acceptedAt DateTime @default(now())
  ip         String?
  user       User     @relation(fields: [userId], references: [id])
  @@index([userId, docType])
}
```

## 3. Logs y registros a conservar (con retención)

| Registro | Campos mínimos | Retención orientativa |
|----------|----------------|-----------------------|
| Aceptación legal | userId, docType, version, ts, ip | Vida de la cuenta + plazo legal |
| Autenticación | userId, ts, ip, resultado | 6–12 meses |
| Actividad de sala | roomId, userId, evento, ts | Vigencia de sala/cuenta |
| Solicitudes de acceso (salas por invitación) | roomId, userId, estado, ts | Hasta resolución + plazo razonable |
| Moderación / sanciones | userId, motivo, medida, decisor, ts | Plazo para acreditar diligencia |
| Denuncias / takedown | caseId, tipo, objeto, medida, ts | Plazo legal / reclamaciones |
| Brechas de seguridad | descripción, alcance, medidas, ts | Según obligación legal |

- [ ] Definir y documentar **plazos concretos** por jurisdicción.
- [ ] Job de **purga/anonimización** automática al vencer la retención.
- [ ] **Minimizar** logs: no registrar contraseñas ni más datos de los necesarios.

## 4. Funciones de moderación recomendables (primera versión)

- [ ] Botón **«Reportar»** en sala, mensaje y perfil → crea `Report` con contexto.
- [ ] **Bandeja de moderación** (rol admin) para revisar y resolver reportes/denuncias.
- [ ] Acciones: retirar contenido, limitar, suspender, bloquear, eliminar cuenta (doc. 8).
- [ ] **Política de reincidencia** automatizable (contador de infracciones por usuario).
- [ ] Canal/endpoint de **takedown** de copyright y registro de casos.
- [ ] Bloqueo/expulsión de un usuario de una sala por el anfitrión (ya existe control por rol).
- [ ] Filtro básico de enlaces (lista de patrones prohibidos) — opcional, con revisión humana.

### Esquema sugerido para reportes (aditivo)
```prisma
model Report {
  id          String   @id @default(cuid())
  reporterId  String?
  targetType  String   // 'room' | 'message' | 'user' | 'link'
  targetId    String
  reason      String   // 'copyright' | 'illegal' | 'abuse' | 'security' | ...
  details     String?
  status      String   @default("open") // open | reviewing | actioned | dismissed
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
  @@index([status, targetType])
}
```

## 5. Puntos donde el backend DEBE validar permisos y trazabilidad

- [ ] **Toda** acción sensible se valida **en servidor**, nunca solo en el cliente:
  - [ ] Crear/editar/eliminar sala → solo propietario/controlador.
  - [ ] Aceptar/rechazar solicitudes de acceso → **solo anfitrión**; sin auto‑aprobación.
  - [ ] Acciones de moderación/sanción → **solo rol con permiso** (`requireAdmin`).
  - [ ] Cambios de perfil/cuenta → solo el titular autenticado.
- [ ] **Rate limiting** en endpoints sensibles (registro, login, solicitudes de acceso, reportes,
      envío de mensajes) para evitar spam/abuso.
- [ ] **Sanitización** de entradas (mensajes, nombres, URLs) y validación de esquema (zod) en todas
      las rutas y eventos de socket.
- [ ] **Trazabilidad**: registrar autor, acción, objeto y timestamp en acciones de moderación,
      sanciones y resolución de denuncias.
- [ ] **Autenticación y sesión** seguras: hashing de contraseñas, expiración de sesión, verificación
      de identidad para ejercicio de derechos.
- [ ] **Validar permisos por sala** en cada evento de socket (no confiar en el estado del cliente).

## 6. Seguridad y privacidad por diseño

- [ ] **HTTPS/TLS** en producción (Render lo provee; en local, certificados para probar cámara).
- [ ] Cifrado de credenciales y secretos fuera del repositorio (variables de entorno).
- [ ] **Minimización**: recoger solo los datos necesarios; no grabar A/V por defecto.
- [ ] **Borrado de cuenta** funcional → supresión/anonimización efectiva de datos.
- [ ] **Exportación de datos** (portabilidad) → endpoint que entregue los datos del usuario.
- [ ] Plan de respuesta ante **brechas** (detección, contención, notificación).

## 7. Antes del lanzamiento público (bloqueantes legales)

- [ ] Revisión de **todos** los documentos por un abogado de `Paraguay` y relleno de placeholders.
- [ ] Designar **contacto/agente de copyright** y **punto de contacto de denuncias**.
- [ ] Fijar **edad mínima** y bloquear el registro por debajo de ella.
- [ ] Definir **mecanismo de transferencia internacional** si la BD/hosting están fuera de la UE.
- [ ] Confirmar arquitectura de **llamadas A/V** (P2P vs servidor; grabación) y reflejarlo en privacidad.
- [ ] Si se añade **monetización**: ampliar Términos (pagos, facturación, desistimiento) y Privacidad.
