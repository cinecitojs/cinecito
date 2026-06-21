# Documentación legal de Cinecito

> **AVISO IMPORTANTE — LEER ANTES DE PUBLICAR**
> Estos documentos son **plantillas profesionales**, redactadas conforme a buenas prácticas
> internacionales (GDPR/UE, LGPD/Brasil, CCPA/CPRA/EE. UU., directiva ePrivacy, DSA/DMCA).
> **No constituyen asesoramiento legal** ni sustituyen la revisión de un abogado colegiado
> en la jurisdicción donde opere CINECITO SA. Los documentos están **listos para producción en
> fase beta/pre‑lanzamiento, sin placeholders**: los datos disponibles están incorporados y los que
> aún no existen (RUC, autoridad de control, fuero, dominio) se redactan de forma genérica y funcional.
> Antes del lanzamiento público, un profesional debe (a) confirmar la jurisdicción y la legislación
> aplicable, (b) concretar esos datos genéricos cuando existan, y (c) validar que las limitaciones de
> responsabilidad sean exigibles en el país de operación.

---

## Índice de documentos

| # | Documento | Archivo |
|---|-----------|---------|
| 1 | Términos y Condiciones de Uso | `01-terminos-y-condiciones.md` |
| 2 | Política de Privacidad | `02-politica-de-privacidad.md` |
| 3 | Política de Copyright, Contenido Prohibido y Notice & Takedown | `03-politica-copyright-y-takedown.md` |
| 4 | Aviso Legal / Descargo de Responsabilidad | `04-aviso-legal.md` |
| 5 | Política de Cookies | `05-politica-de-cookies.md` |
| 6 | Texto de consentimiento de registro | `06-consentimiento-registro.md` |
| 7 | Texto de consentimiento de cookies (banner) | `07-consentimiento-cookies.md` |
| 8 | Política de suspensión, bloqueo y eliminación de cuentas | `08-politica-cuentas-sanciones.md` |
| 9 | Procedimiento de denuncias de contenido ilegal/infractor/abusivo | `09-procedimiento-denuncias.md` |
| 10 | FAQ legal para usuarios | `10-faq-legal.md` |
| 11 | Checklist técnica y de producto para desarrolladores | `11-checklist-tecnica-desarrolladores.md` |
| 12 | Aviso Legal de Contribuciones y Política de Apoyo Voluntario | `12-contribuciones-y-apoyo-voluntario.md` |
| — | Notas de implementación para el equipo | `NOTAS-IMPLEMENTACION.md` |

---

## A. Auditoría de riesgos legales y vacíos de información

### A.1 — Supuestos legales asumidos (deben confirmarse)

1. **Cinecito es un intermediario técnico**, no un proveedor de contenido: no aloja, no
   almacena ni retransmite obras audiovisuales desde sus servidores; solo sincroniza la
   reproducción de URLs aportadas por los usuarios y facilita comunicación entre ellos.
   Esta caracterización es la que sostiene toda la estrategia de responsabilidad limitada.
2. **El operador es una entidad identificable** (persona física o jurídica) con domicilio
   y un canal de contacto estable. Sin operador identificable, las exenciones de
   responsabilidad de intermediario y los procedimientos de *takedown* pierden eficacia.
3. **Existe una relación contractual** usuario–plataforma formada por la aceptación
   expresa de los Términos en el registro (no por mero uso).
4. **No hay monetización** en esta versión: no se tratan datos de pago ni hay obligaciones
   fiscales de consumo. Si esto cambia, varios documentos deben ampliarse.
5. **No hay subida de archivos** desde el dispositivo: el contenido es siempre un enlace
   externo. Esto reduce —pero no elimina— la exposición por alojamiento de material ilícito.
6. **El tratamiento de datos personales es limitado y proporcionado** (identidad básica,
   datos técnicos, chat, presencia, logs) y se realiza con base jurídica válida (ejecución
   del contrato, interés legítimo, consentimiento para cookies no esenciales).
7. **Las llamadas de audio/vídeo** (si están activas) transmiten flujos entre usuarios; se
   asume minimización (no se graban salvo que se indique). **Confirmar si son P2P o pasan
   por servidor**, porque cambia la calificación del tratamiento.

### A.2 — Riesgos legales principales (ordenados por severidad)

| Riesgo | Descripción | Mitigación incorporada |
|--------|-------------|------------------------|
| **Responsabilidad secundaria por copyright** | Sincronizar y facilitar el acceso a enlaces de streaming puede generar responsabilidad por *inducción/contribución* aunque no se aloje el contenido (doctrina *Grokster*, art. 17 DSM UE, comunicación al público *GS Media*). | Doc. 3 completo: prohibición expresa de enlazar a material infractor, AUP, *notice & takedown*, política de **infractores reincidentes**, no incitación a la piratería. |
| **Pérdida del puerto seguro de intermediario** | Sin procedimiento de retirada diligente ni designación de agente, se pierde la exención (DMCA §512, art. 6 DSA, Directiva e‑Commerce). | Procedimiento de denuncia + retirada + contranotificación + plazos + registro. |
| **Protección de datos (RGPD/LGPD/CCPA)** | Chat, presencia, logs y datos de conexión son datos personales. Sin base jurídica, retención e información clara hay exposición sancionadora. | Doc. 2: bases jurídicas, finalidades, retención, derechos del interesado, transferencias. |
| **Menores de edad** | Plataforma social con chat y cámara: riesgo COPPA (<13 EE. UU.), edad de consentimiento digital RGPD (13–16 según país). | Edad mínima `16`, declaración en registro, supresión de cuentas de menores. |
| **Contenido generado por usuarios / cámara** | Chat y vídeo pueden vehicular contenido abusivo, ilegal o no consentido (CSAM, acoso, NCII). | Doc. 8 y 9: moderación, sanciones, reporte y cooperación con autoridades. |
| **Transferencias internacionales de datos** | Infra/BD alojada fuera de la UE (p. ej. Supabase región EE. UU.) implica transferencia internacional. | Cláusula de transferencias con garantías genéricas (proveedores con protección equiparable + cláusulas contractuales); concretar SCC/decisión de adecuación según hosting definitivo. |
| **Exigibilidad de las exclusiones de responsabilidad** | Las limitaciones absolutas no son válidas frente a consumidores en muchas jurisdicciones (dolo, negligencia grave, derechos imperativos). | Limitación **proporcionada** con salvedades de ley imperativa. |
| **Suplantación / seguridad de cuentas** | Identidades falsas, acceso no autorizado. | AUP + política de cuentas + medidas técnicas de seguridad documentadas. |

### A.3 — Información que falta para fijar una jurisdicción concreta

Para cerrar los textos a un país concreto necesitamos:

1. **Naturaleza y datos del operador**: `CINECITO SA`, `Guairá, Paraguay`, operado de forma
   independiente por su desarrollador. Los datos registrales/fiscales se incorporarán al formalizarse
   la actividad; mientras tanto las cláusulas usan expresiones neutrales («el Operador de la Plataforma»).
2. **País de establecimiento** `Paraguay`; **legislación aplicable** `las leyes de la República del
   Paraguay`; **fuero**: los tribunales competentes de la República del Paraguay.
3. **Público objetivo / países de los usuarios** (define si aplica RGPD por extraterritorialidad,
   LGPD, CCPA, etc.).
4. **Edad mínima** `16` (decisión de producto + límite legal del país).
5. **Ubicación de hosting y base de datos** (define transferencias internacionales).
6. **¿Las llamadas A/V pasan por servidor o son P2P?** ¿Se graban? (define el tratamiento).
7. **Canal de contacto legal/privacidad** `cinecitojs@gmail.com` y, si aplica, **DPO**.
8. **¿Habrá monetización** a corto plazo? (planes, pagos, facturación).

### A.4 — Estado de los datos del operador (sin placeholders)

Los documentos están redactados **listos para producción en fase beta/pre‑lanzamiento**, sin
placeholders. Los datos disponibles están incorporados; los que aún no existen se expresan de forma
neutral y funcional.

**Datos incorporados:**
Operador `CINECITO SA` (proyecto independiente operado por su desarrollador) · País `Paraguay` ·
Domicilio `Guairá` · Contacto y agente de copyright `cinecitojs@gmail.com` · Edad mínima `16` ·
Legislación aplicable `las leyes de la República del Paraguay` · Fecha de vigencia `20 de junio de 2026`.

**Datos redactados de forma genérica** (a concretar cuando existan, sin bloquear el lanzamiento):
- **Identificación fiscal/RUC** → se sustituye por «proyecto independiente operado por su desarrollador».
- **Autoridad de control de datos** → «la autoridad de control en materia de protección de datos que
  resulte competente».
- **Fuero judicial** → «los tribunales competentes de la República del Paraguay».
- **Dominio web** → «Cinecito (aplicación web)» y enlaces relativos `/legal/...`.
- **Transferencias internacionales** → garantías genéricas (proveedores con protección equiparable +
  cláusulas contractuales), a concretar según el hosting definitivo.
