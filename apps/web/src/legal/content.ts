// apps/web/src/legal/content.ts
// Contenido legal mostrado dentro de la app. Versión user-facing (sustantiva y honesta)
// de los documentos de /legal/*.md. Sin placeholders: datos del operador incorporados y, lo que aún
// no existe (RUC, autoridad, dominio), redactado de forma genérica/funcional para fase beta.
// El texto admite un mini-markdown: '## '/'### ' encabezados, '- ' listas, **negrita**,
// [texto](url), y párrafos separados por línea en blanco.

export interface LegalDoc {
  slug: string;
  title: string;
  short: string;     // etiqueta corta para footer / índice
  updated: string;
  body: string;
}

const UPDATED = '20 de junio de 2026';

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: 'terminos',
    title: 'Términos y Condiciones de Uso',
    short: 'Términos y Condiciones',
    updated: UPDATED,
    body: `
Estos Términos regulan el uso de **Cinecito**, una aplicación web para ver vídeos de forma sincronizada en salas y comunicarse entre usuarios. Titular: **CINECITO SA**, Guairá, Paraguay. Contacto: **cinecitojs@gmail.com**.

## 1. Aceptación
El uso de Cinecito implica la aceptación plena de estos Términos. La aceptación se manifiesta de forma expresa al marcar la casilla correspondiente durante el registro.

## 2. Qué es Cinecito
Cinecito es una **herramienta de sincronización y comunicación**. **No aloja, no almacena ni retransmite** películas, series ni vídeos desde sus servidores: únicamente coordina la reproducción de **URLs y contenidos aportados por los propios usuarios**.

## 3. Edad mínima
Para usar Cinecito debés tener al menos **16 años** y capacidad legal. Si tu país exige una edad superior para el consentimiento de datos, prevalece esa edad.

## 4. Cuentas
Sos responsable de la confidencialidad de tus credenciales y de la actividad de tu cuenta. No está permitido suplantar a terceros ni crear cuentas para eludir sanciones.

## 5. Responsabilidad sobre el contenido y los enlaces
**Sos el único responsable** de los enlaces, mensajes y contenidos que compartas. Al compartir un enlace **declarás que tenés derecho a hacerlo** y que no infringe derechos de terceros ni la ley. Cinecito no asume titularidad ni control editorial del contenido aportado.

## 6. Uso aceptable
Está prohibido usar Cinecito para:
- Compartir o enlazar contenido protegido por **derechos de autor** sin autorización.
- Difundir **material ilegal** (abuso de menores, contenido de explotación, incitación al odio o la violencia, terrorismo, fraude).
- Acosar, amenazar, difamar, suplantar o vulnerar la intimidad de otras personas.
- Distribuir malware, spam o phishing, o comprometer la seguridad del servicio.
- Eludir medidas de moderación o de seguridad.

## 7. Moderación y sanciones
Podemos retirar contenido y **suspender o eliminar** cuentas que infrinjan estos Términos o la ley. Aplicamos una **política de infractores reincidentes**. Más detalle en la [Política de Copyright](/legal/copyright).

## 8. Propiedad intelectual de la plataforma
La marca «Cinecito», el software, el diseño y los elementos gráficos pertenecen a CINECITO SA o sus licenciantes. Se te concede una licencia limitada, no exclusiva y revocable de uso.

## 9. Enlaces de terceros
El contenido enlazado por los usuarios está alojado por terceros. Cinecito **no controla ni se responsabiliza** de dichos sitios ni de su contenido.

## 10. Exclusión de garantías y limitación de responsabilidad
El servicio se presta **«tal cual» y «según disponibilidad»**. En la medida permitida por la ley, Cinecito no responde por daños derivados del contenido aportado por los usuarios ni del uso del servicio. **No se excluye la responsabilidad que la ley no permita excluir.**

## 11. Aportes voluntarios
Cinecito puede ofrecer una sección de **apoyo voluntario**. Los aportes son **opcionales**, no condicionan el uso del servicio y se rigen por el [Aviso Legal de Contribuciones](/legal/contribuciones). No constituyen inversión, participación ni propiedad sobre Cinecito, y las recompensas asociadas son únicamente **cosméticas** (sin ventaja funcional).

## 12. Cambios y ley aplicable
Podemos actualizar estos Términos avisando los cambios sustanciales. Se rigen por **las leyes de la República del Paraguay**, con sumisión a **los tribunales competentes de la República del Paraguay**, sin perjuicio de los derechos imperativos del consumidor.

_Documento plantilla — pendiente de revisión legal antes del lanzamiento público._
`,
  },
  {
    slug: 'privacidad',
    title: 'Política de Privacidad',
    short: 'Privacidad',
    updated: UPDATED,
    body: `
Responsable: **CINECITO SA**, Guairá, Paraguay. Contacto: **cinecitojs@gmail.com**. Redactada conforme a buenas prácticas internacionales (RGPD, LGPD, CCPA/CPRA).

## 1. Datos que tratamos
- **Cuenta:** usuario, correo electrónico y contraseña (almacenada **cifrada/hash**).
- **Perfil:** avatar y preferencias de configuración.
- **Comunicación:** mensajes de chat, reacciones e invitaciones.
- **Enlaces/URLs** que compartís para reproducir contenido.
- **Datos técnicos y de actividad:** IP, identificadores de sesión, dispositivo/navegador, entradas y salidas de sala, presencia, eventos de sincronización, solicitudes de acceso.
- **Registros (logs)** técnicos y de seguridad.

No solicitamos datos de categorías especiales ni datos de pago (no hay monetización en esta versión). Las **llamadas de audio/vídeo no se graban** salvo indicación expresa.

## 2. Finalidades y bases jurídicas
- Crear y gestionar tu cuenta y prestar el servicio → **ejecución del contrato**.
- Seguridad, prevención de abuso, moderación → **interés legítimo / obligación legal**.
- Cookies y analítica no esencial → **consentimiento**.
- Cumplir requerimientos legales → **obligación legal**.

## 3. Destinatarios
No vendemos tus datos. Se comparten con **proveedores de infraestructura** (encargados del tratamiento bajo contrato), con **otros usuarios** (lo inherente a compartir una sala) y con **autoridades** cuando exista obligación legal.

## 4. Transferencias internacionales
Para operar, podemos usar proveedores de infraestructura situados en otros países, por lo que tus datos pueden tratarse fuera de tu país. En esos casos aplicamos **garantías adecuadas**: proveedores con niveles de protección equiparables, cláusulas contractuales de protección de datos y minimización de los datos tratados.

## 5. Conservación
Conservamos los datos mientras tu cuenta esté activa y, después, solo lo necesario por obligación legal; el resto se **suprime o anonimiza**. Las salas efímeras se eliminan al cerrarse. Logs técnicos: plazo limitado.

## 6. Tus derechos
Podés ejercer **acceso, rectificación, supresión, oposición, limitación y portabilidad**, y **retirar el consentimiento**. Escribí a **cinecitojs@gmail.com**. También podés gestionar tus consentimientos y **eliminar tu cuenta** desde Ajustes. Si no quedás conforme, podés reclamar ante **la autoridad de control en materia de protección de datos que resulte competente**.

## 7. Menores
Cinecito no está dirigido a menores de **16 años**. Si detectamos una cuenta de un menor no autorizado, la eliminamos.

## 8. Seguridad
Aplicamos cifrado de credenciales (hash), transmisión cifrada (HTTPS/TLS), control de accesos por rol, validación de permisos en servidor y minimización de datos.

_Documento plantilla — pendiente de revisión legal antes del lanzamiento público._
`,
  },
  {
    slug: 'cookies',
    title: 'Política de Cookies',
    short: 'Cookies',
    updated: UPDATED,
    body: `
Esta Política explica las cookies y el almacenamiento local (localStorage/sessionStorage) que usa **Cinecito**.

## 1. Qué usamos
- **Técnicas / necesarias** (no requieren consentimiento): sesión iniciada, preferencias de interfaz (tema, dispositivos), seguridad. Sin ellas el servicio no funciona.
- **Preferencias / analítica** (requieren consentimiento): se cargan **solo si las aceptás** en el banner. Hoy no usamos analítica ni cookies de seguimiento.
- **Publicitarias / de seguimiento**: **no utilizamos**.

## 2. Base jurídica
Las técnicas se usan por **interés legítimo / ejecución del contrato**. Las no esenciales, solo con tu **consentimiento**, revocable en cualquier momento.

## 3. Gestión
Podés aceptar o rechazar las cookies no esenciales desde el **banner** y, luego, desde **Ajustes → Legal → Gestión de consentimiento**. También podés borrar cookies y almacenamiento desde tu navegador (deshabilitar las técnicas puede impedir el funcionamiento).

_Documento plantilla — pendiente de revisión legal antes del lanzamiento público._
`,
  },
  {
    slug: 'copyright',
    title: 'Copyright, Contenido Prohibido y Notice & Takedown',
    short: 'Copyright',
    updated: UPDATED,
    body: `
Cinecito respeta los derechos de propiedad intelectual y exige a sus usuarios que también lo hagan.

## 1. Naturaleza del servicio
Cinecito **no aloja, no almacena ni retransmite** contenido protegido desde sus servidores. El contenido procede de **enlaces aportados por los usuarios**, alojados en servidores de terceros. **Cada usuario es responsable** de los enlaces que comparte.

## 2. Contenido prohibido
- Obras protegidas por derechos de autor **sin autorización**.
- **Material de abuso sexual infantil (CSAM)** y contenido de explotación de menores.
- Imágenes íntimas no consentidas, contenido que incite al odio, la violencia o el terrorismo.
- Malware, phishing, fraude o cualquier contenido ilícito.

El CSAM se retira de inmediato y se reporta a las autoridades, sin necesidad de notificación previa.

## 3. Notice & Takedown
Si sos titular de derechos y considerás que un contenido infringe los tuyos, escribí a **cinecitojs@gmail.com** con: identificación de la obra, localización del material (sala, enlace, fecha/hora), tus datos de contacto, declaración de buena fe y de veracidad, y tu firma. Acusaremos recibo, evaluaremos y, si procede, **retiraremos o bloquearemos** el acceso y notificaremos al usuario afectado (que podrá presentar **contranotificación**).

## 4. Infractores reincidentes
Las cuentas con infracciones reiteradas y fundadas serán **canceladas de forma definitiva**.

## 5. Reportes
Cualquier usuario puede **reportar** contenido o conductas desde la propia aplicación o escribiendo a cinecitojs@gmail.com.

_Documento plantilla — pendiente de revisión legal antes del lanzamiento público._
`,
  },
  {
    slug: 'aviso-legal',
    title: 'Aviso Legal y Descargo de Responsabilidad',
    short: 'Aviso Legal',
    updated: UPDATED,
    body: `
## 1. Titular
- **Titular:** CINECITO SA
- **Domicilio:** Guairá, Paraguay
- **Naturaleza:** Proyecto independiente operado por su desarrollador (persona física)
- **Contacto:** cinecitojs@gmail.com

## 2. Objeto
Cinecito es una **herramienta de sincronización y comunicación** para ver vídeos en salas. No produce, aloja ni distribuye contenido audiovisual protegido desde sus servidores.

## 3. Descargo sobre el contenido
Los contenidos y enlaces son **aportados por los usuarios**. Cinecito no ejerce control editorial previo y **no se responsabiliza** de su legalidad, veracidad o disponibilidad. Retiraremos el contenido ilícito del que tengamos conocimiento efectivo.

## 4. Disponibilidad
El servicio se ofrece **«tal cual» y «según disponibilidad»**, sin garantía de continuidad.

## 5. Ley aplicable
Se rige por **las leyes de la República del Paraguay**, con sumisión a **los tribunales competentes de la República del Paraguay**, sin perjuicio de los derechos imperativos del consumidor.

_Documento plantilla — pendiente de revisión legal antes del lanzamiento público._
`,
  },
  {
    slug: 'contribuciones',
    title: 'Aviso Legal de Contribuciones y Política de Apoyo Voluntario',
    short: 'Contribuciones',
    updated: UPDATED,
    body: `
Este documento regula las **contribuciones voluntarias** a **Cinecito**, operado por CINECITO SA (proyecto independiente operado por su desarrollador), Guairá, Paraguay. Contacto: **cinecitojs@gmail.com**.

## 1. Naturaleza voluntaria
Las contribuciones a Cinecito son **completamente voluntarias**. Cinecito es y seguirá siendo **utilizable de forma gratuita**, realices o no un aporte. Ninguna función esencial depende de contribuir.

## 2. Qué NO es una contribución
Una contribución a Cinecito **no** constituye:
- Una **inversión** ni un instrumento financiero.
- Una **participación**, acción o cuota en el proyecto.
- Un derecho de **propiedad** sobre Cinecito o su sociedad operadora.
- Una **garantía** de funciones futuras, resultados o disponibilidad.
- Una **compra** de bienes o servicios digitales esenciales.

No se trata de crowdfunding financiero ni de un esquema de participación empresarial.

## 3. Destino de los fondos
Las contribuciones ayudan a cubrir los costos de **hosting y servidores, desarrollo de nuevas funciones, mantenimiento y costos operativos** (dominio, base de datos, servicios y herramientas). El Operador de la Plataforma decide de buena fe la asignación de estos recursos.

## 4. Recompensas cosméticas
A modo de agradecimiento, una contribución puede habilitar **recompensas puramente cosméticas** (insignia de apoyo, fondo de perfil, efectos decorativos y reconocimiento opcional). Estas recompensas:
- **No otorgan ninguna ventaja competitiva** ni funcional.
- **No desbloquean funciones esenciales** del servicio.
- Son **únicamente elementos visuales** de agradecimiento y pueden modificarse o retirarse por motivos técnicos.

## 5. Procesamiento del pago
Cuando esté disponible, el pago se procesará a través de **proveedores de pago externos**, sujetos a sus propios términos y políticas de privacidad. Cinecito no almacena los datos completos de tu medio de pago. Mientras no haya un proveedor habilitado, tu interés en aportar se registra sin que se realice ningún cobro.

## 6. Reembolsos
Al tratarse de aportes voluntarios sin contraprestación esencial, **no se garantizan reembolsos**, salvo error de cobro demostrable o cuando lo exija la ley aplicable. Para cualquier consulta escribí a **cinecitojs@gmail.com**.

## 7. Datos personales
El tratamiento de los datos asociados a una contribución (por ejemplo, tu mensaje o tu reconocimiento opcional) se rige por la [Política de Privacidad](/legal/privacidad).

## 8. Cambios
Podemos actualizar esta política y los niveles o recompensas de apoyo. Los cambios sustanciales se comunicarán por un medio adecuado.

_Documento plantilla — pendiente de revisión legal antes del lanzamiento público._
`,
  },
  {
    slug: 'contacto',
    title: 'Contacto',
    short: 'Contacto',
    updated: UPDATED,
    body: `
## Cómo contactarnos
Para consultas legales, de privacidad, ejercicio de derechos sobre tus datos, denuncias de contenido o solicitudes de retirada (**takedown**):

- **Correo:** cinecitojs@gmail.com
- **Titular:** CINECITO SA
- **Domicilio:** Guairá, Paraguay

## Denuncias y reportes
Podés **reportar** contenido o conductas directamente desde la aplicación (botón «Reportar» en salas, mensajes y perfiles) o escribiendo al correo de contacto. Atenderemos las denuncias con la mayor diligencia posible y, ante contenido manifiestamente ilícito, de forma inmediata.

## Derechos sobre tus datos
Podés ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo al correo de contacto, o gestionar tus consentimientos y eliminar tu cuenta desde **Ajustes → Legal**.
`,
  },
];

export const LEGAL_BY_SLUG: Record<string, LegalDoc> =
  Object.fromEntries(LEGAL_DOCS.map((d) => [d.slug, d]));

// Enlaces del footer (orden mostrado).
export const FOOTER_LEGAL_LINKS = [
  { slug: 'terminos', label: 'Términos y Condiciones' },
  { slug: 'privacidad', label: 'Privacidad' },
  { slug: 'cookies', label: 'Cookies' },
  { slug: 'copyright', label: 'Copyright' },
  { slug: 'aviso-legal', label: 'Aviso Legal' },
  { slug: 'contribuciones', label: 'Contribuciones' },
  { slug: 'contacto', label: 'Contacto' },
];
