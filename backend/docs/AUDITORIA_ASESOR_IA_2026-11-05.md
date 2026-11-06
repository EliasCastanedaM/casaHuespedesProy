# Auditoría técnica del asesor IA — Casa Huéspedes Pimentel

Fecha: 5 de noviembre de 2026, America/Lima (UTC−5).
Base del análisis: `main`, commit `b1d0d074a5205cbac010fa9894b2acd9fe9a0fb3`.
Alcance: código del asesor, Meta, reservas, administración, migraciones,
pruebas y lectura de infraestructura. Esta auditoría no certifica todos los
controles de seguridad del proyecto ni sustituye una prueba de penetración.

## 1. Resultado y alcance de la verificación

El proyecto dispone de un motor común basado en Responses API, respuestas
programadas y herramientas de consulta al catálogo/inventario interno. Los
tres canales tienen evidencia de mensajes salientes del asesor en la base.
WhatsApp incluye estados de lectura; Instagram y Facebook registran envíos
aceptados. Los registros pueden incluir pruebas anteriores: no se atribuyen
todos a huéspedes reales ni equivalen a una prueba nueva de extremo a extremo.

La reserva asistida por WhatsApp exige validación humana. Su continuación
está implementada en el backend, pero bloqueada en la interfaz. La vinculación
de la app WhatsApp Business mediante coexistencia sigue restringida.

Durante esta auditoría no se enviaron mensajes a clientes, no se crearon
reservas, no se modificaron datos, credenciales, números, permisos de Meta
ni configuración de producción. Las correcciones descritas en la sección 7
se preparan en una rama para revisión.

### Infraestructura observada

| Componente | Evidencia | Interpretación |
| --- | --- | --- |
| GitHub | `main` en `b1d0d07` | Código actual revisado |
| Render | Servicio `casa-real-huespedes-backend`, deploy `dep-dbinj23ncjis73cqlel0`, estado `live`, SHA `15f5f8c` | El SHA es anterior, pero el diff hasta `main` solo contiene frontend/CI: backend equivalente |
| HTTP del backend | `GET /api/health`: HTTP 200, `aiConfigured: true`, `deployedCommit: 15f5f8c35b2fde8177b5ce054549269d361cb3ae` | Servicio accesible y presencia de clave; no verifica por sí solo saldo, permisos ni una conversación |
| Vercel | Producción `dpl_JAss9ZVuTQe6EFhbSCYZJveKjeEo`, `READY`, SHA `b1d0d07` | El frontend desplegado incluye controles manuales del PR #76; no se realizó sesión administrativa desde navegador |
| Supabase | Proyecto `casa-huespedes-pimentel`, `ACTIVE_HEALTHY` | Lectura SQL agregada y revisión de permisos disponibles |
| Meta | Sin acceso directo al panel de revisión/permisos de la app | No se confirma aprobación de coexistencia ni vigencia de todos los permisos |

Render informa plan de ejecución `free`, una instancia, build `npm install`,
sin ruta HTTP de health configurada. La ruta `/api/health` existe, pero su mera
existencia no implica que Render la use para sus comprobaciones.
La consulta de logs con nivel `error` desde el 4 de noviembre 00:00 Lima hasta
la revisión devolvió cero entradas; es un resultado acotado, no ausencia
demostrada de fallos. Las métricas de memoria devueltas rondaron 85–93 MiB;
las series HTTP consultadas estaban vacías y no permiten calcular latencia.

## 2. Arquitectura real y recorrido de un mensaje

| Capa | Implementación principal |
| --- | --- |
| Entrada | `src/modules/meta/meta.routes.js`: GET/POST `/api/meta/webhook` |
| Autenticidad | HMAC sobre cuerpo original; secretos Meta/Instagram; verificación del challenge |
| Adaptación | `parseMetaWebhook`, normalización de canal/remitente/ID/tipo; `instagram.transport.js` |
| Persistencia | `meta_messages`, `meta_conversations`, deduplicación e intento de procesamiento |
| Orquestación | Cola por canal/remitente; handoff; `generateAiReply`; flujos programados |
| Inteligencia | `ai.service.js`, `ai.prompt.js`, `ai.scope.js`, OpenAI Responses |
| Fuentes oficiales | Categorías, habitaciones, servicios, perfil del hotel y reglas comerciales |
| Reservas | `ai.booking-flow.js`, `ai.whatsapp-mvp.js`, `booking.service.js` |
| Salida | Registro outgoing, adaptador del canal, reintentos, callbacks de estado |
| Operación | Mensajes, consumo IA, reservas y calendario en frontend React/Vite |

Recorrido comprobado por lectura de código:

1. Meta entrega un POST. Express captura el cuerpo original antes del parser.
2. El controlador valida la firma. Los eventos de coexistencia se persisten
   primero para que una intervención móvil reciente pueda pausar el chat.
3. Normaliza mensajes y estados. Guarda la entrada antes del HTTP 200.
4. Programa el procesamiento fuera del tiempo de respuesta HTTP, en orden
   por canal/remitente dentro de una instancia.
5. Reclama el mensaje de forma durable y descarta duplicados. Si hay atención
   humana, conserva datos de WhatsApp y evita generar una respuesta automática.
6. Atiende solicitudes explícitas de humano y mensajes de tipo no soportado.
   Para texto, usa reglas/respuestas programadas o el motor OpenAI.
7. El motor consulta datos autorizados y conserva el estado de reserva.
8. Antes de responder vuelve a comprobar si el personal tomó la conversación.
9. Guarda el outgoing y lo entrega al adaptador. Los estados posteriores
   `sent`, `delivered`, `read` o `failed` se actualizan desde webhooks.
10. El servidor recupera pendientes al iniciar y cada 60 segundos, con un
    máximo de cinco intentos de procesamiento según el estado guardado.

Compartir el motor no unifica identidades: la memoria está separada por
`channel:externalUserId`. Una persona que pasa de Instagram a WhatsApp no
hereda automáticamente su conversación previa.

## 3. Estado verificable por canal

Instantánea SQL agregada al 5 de noviembre por la noche en Lima:

| Canal | Entrantes | Salientes IA | Atención manual guardada | Último envío IA creado |
| --- | ---: | --- | --- | --- |
| WhatsApp | 90 | 81 `read`; 2 `failed` | 4 `read`, 1 `delivered`, 1 `sent`, 1 `failed` | 2 noviembre, 20:32 Lima |
| Instagram | 148 | 144 `sent` | 8 `sent` | 5 noviembre, 21:41 Lima |
| Facebook | 13 | 12 `sent` | 2 `sent` | 14 octubre, 06:06 Lima |

Hay 21 conversaciones: 12 de Instagram, 4 de Facebook y 5 de WhatsApp.
Ninguna estaba marcada en handoff activo o resuelta en esa instantánea.
`sent` confirma el estado registrado por el sistema, no que el destinatario
haya leído el mensaje. WhatsApp sí conserva estados `read`.

### WhatsApp

Recopila fechas, adultos, niños/edades, mascotas y preferencias. Recomienda
categoría compatible sin afirmar stock. Su herramienta OpenAI no incluye
`consultar_disponibilidad`. Deriva la verificación de disponibilidad e importe
al personal. El backend admite una aprobación administrativa y continuación
con datos personales y pago, pero `MessagesAdmin.jsx` la bloquea para WhatsApp.
No se cambia esa restricción en esta entrega.

Existe manejo de `history`, `smb_app_state_sync` y `smb_message_echoes`.
Supabase contiene dos eventos archivados: uno `history` y uno
`smb_message_echoes`, del 29 de octubre. No demuestran por sí solos que la
coexistencia esté aprobada ni que todos los dispositivos emitan eventos.
Los ecos recientes pueden tomar el chat; los antiguos no deben hacerlo.
Embedded Signup está tras una bandera explícita; el controlador consulta
cuentas y descarta el token temporal, sin sustituir el token ni número activo.

### Instagram y Facebook

Pueden consultar inventario interno y generar prerreservas. Instagram divide
respuestas largas y guarda progreso de entrega para reanudar partes pendientes.
La intervención humana se controla desde el panel. Los ecos de mensajes de
Messenger/Instagram se ignoran en el parser actual; no hay evidencia en este
código de pausa automática por toda respuesta hecha desde las apps nativas.
Ese comportamiento requiere una validación específica con permisos y eventos
reales antes de presentarlo como soportado.

### Web y otros canales

`POST /api/ai/chat` exige `x-ai-token` y deniega acceso si el token interno está
ausente. No se encontró un chat público conectado a ese endpoint en el
frontend actual. TikTok es una etiqueta admitida, sin adaptador de mensajería.
Audio e imágenes reciben una invitación a escribir texto; no hay transcripción
ni interpretación visual implementadas en este recorrido.

## 4. OpenAI, conocimiento y estado

El lockfile y el código usan el SDK `openai`, con Responses API. La configuración
predeterminada es `gpt-5.6-luna`; los 11 eventos de consumo existentes también
registran ese modelo. Esto acredita su uso anterior, no una consulta nueva a
la cuenta OpenAI. Las operaciones registradas son clasificador, respuesta y
continuación de herramientas. La estimación monetaria usa una tabla local y
no equivale a la factura del proveedor.

El modelo dispone de dos funciones con esquema estricto:
`listar_habitaciones` y `consultar_disponibilidad`; esta última se excluye en
WhatsApp. La creación de reservas y los estados de pago están gobernados por
código, no por una función de escritura libre disponible al modelo.
El prompt se reenvía en cada llamada y limita la consulta a temas del hotel.
El filtro de alcance clasifica mensajes ambiguos con un llamado independiente
y deniega por defecto ante error. Es una barrera, no garantía absoluta frente
a toda inyección de instrucciones.

Precios y capacidad proceden del catálogo SQL. Servicios y dirección tienen
consultas específicas; las políticas usan `hotel_policy_rules`, además de
reglas duplicadas en el prompt/flujo WhatsApp. No se encontró lectura recurrente
de Excel, embeddings, vector store ni RAG documental.

| Dato | Persistencia y alcance |
| --- | --- |
| Mensajes y entrega | `meta_messages`, historial de cliente/IA/equipo |
| Estado humano/resolución | `meta_conversations` |
| Contexto de reserva y response ID | `ai_conversations` |
| Eventos de coexistencia | `meta_coexistence_events`, payload archivado |
| Consumo | `ai_usage_events`, etiqueta HMAC sin texto del mensaje |
| Reserva/pago | `bookings`, `payments`, clientes y códigos internos |

Los borradores normales caducan a los 30 minutos; WhatsApp y contextos de
reservas registradas usan 24 horas. Caducidad lógica no equivale a borrado del
historial. WhatsApp limita historial a ocho mensajes/3.200 caracteres y evita
reutilizar el response ID entre turnos. Otros canales pueden encadenar
`previous_response_id`; su contexto remoto puede seguir creciendo aunque
la carga local esté limitada. Las respuestas generales usan `store: true`.
La política de conservación externa y la retención local están pendientes de
una decisión documentada; el panel de privacidad es de solo lectura.

El catálogo operativo confirma 13 habitaciones activas, seis categorías,
capacidades de 2/2/2/3/5/5 y tarifas por noche de S/120/140/140/210/250/250
en el orden Estándar/Ejecutiva/Doble/Triple/Familiar 1/Familiar 2. Son una
instantánea de la base, no una promesa de disponibilidad. La tabla operativa
`bookings` contiene cero filas; las tablas archivadas no se incluyen en ese
recuento. Booking/Airbnb/Beds24 no están sincronizados por este código.

## 5. Problemas, vulnerabilidades y limitaciones

| ID | Prioridad | Clasificación | Evidencia e impacto |
| --- | --- | --- | --- |
| A01 | P1 | Limitación operativa deliberada | `MessagesAdmin.jsx`, `confirmReservation()` y botón: bloquean la aprobación WhatsApp; el flujo backend no es cerrable desde esa pantalla |
| A02 | P1 | Riesgo comercial | Stock solo interno, cero reservas operativas; sin conciliación Booking/Airbnb no se garantiza disponibilidad comercial completa |
| A03 | P1 | Error reproducido | Descripción de Ejecutiva identifica una unidad física; el formateador la copiaba al comparar categorías, incumpliendo el prompt |
| A04 | P2 | Error reproducido | Opciones de pago WhatsApp contenían `\\n` literal en cuatro idiomas |
| A05 | P1 | Riesgo de consistencia | Mascotas/niños/grupos están en SQL y también hardcoded en prompt/WhatsApp; una aprobación comercial futura no actualiza todas las rutas |
| A06 | P2 | Riesgo de privacidad/costo | `store: true`, cadenas remotas IG/FB y ausencia de política de limpieza efectiva; métricas no equivalen al cobro oficial |
| A07 | P2 | Riesgo de transporte | `config/db.js` usa TLS con `rejectUnauthorized: false`; hay cifrado pero no validación normal del certificado. Preparar CA/verificación en entorno controlado antes de cambiarlo |
| A08 | P2 | Riesgo de recuperación | Instagram no clasifica errores permanentes como el adaptador común. `nonRetryable` detiene la ráfaga en algunos fallos, pero la recuperación durable solo marca terminal el mismatch de número: otros fallos pueden reintentarse en ciclos posteriores |
| A09 | P2 | Limitación de handoff | No está demostrada la pausa por toda acción de apps nativas IG/FB ni de todos los clientes complementarios de WhatsApp |
| A10 | P2 | Riesgo de escala | Orden por conversación en memoria local; antes de más instancias se debe verificar orden y exclusión por conversación entre procesos |
| A11 | P2 | Brecha de monitoreo/configuración | Render sin health HTTP configurado y build `npm install`, distintos de la guía; métricas HTTP vacías en la consulta |
| A12 | P3 | Documentación obsoleta | La entrega del 31/10 aún describía WhatsApp solo lectura después del PR #76 |
| A13 | P2 | Límite de garantía | Existe ledger/idempotencia, pero una aceptación externa con pérdida de respuesta antes de persistir su ID deja ambigüedad; no prometer entrega exactamente una vez |

P1: resolver antes de ampliar ventas automáticas. P2: endurecimiento operativo
planificado. P3: claridad documental. No se detectó una explotación crítica
demostrada en el alcance revisado; eso no significa ausencia de vulnerabilidades.

### Controles comprobados y hallazgos que no son vulnerabilidades

- Firma de webhooks y challenge; en producción se exige secreto para verificar.
- Entradas parametrizadas SQL y validaciones; tools con esquema estricto y
  proyección acotada de categorías.
- Endpoint interno IA cerrado por defecto, límites de uso y validación de tamaño.
- Sesiones administrativas revocables, rol vigente consultado en PostgreSQL;
  aprobación de reserva y consumo restringidos a rol administrador.
- Reserva transaccional, locks por inventario/intención y recuperación por ID
  para evitar duplicar una intención; el cobro no se confirma por texto del huésped.
- Doble comprobación del handoff y protección de recuperación cuando un humano
  tomó el chat; no reactiva atención por ecos móviles antiguos.
- Las 34 tablas públicas consultadas tienen RLS. La revisión de permisos
  efectivos `SELECT/INSERT/UPDATE/DELETE` de `anon` y `authenticated` devolvió
  cero tablas accesibles. El advisor solo emitió 34 avisos informativos de
  RLS sin políticas, compatibles con el acceso por backend SQL. No abrir tablas
  ni crear políticas permisivas para silenciar esos avisos.

## 6. Plan técnico y criterios de aceptación

| Fase | Trabajo | Criterios de prueba y salida |
| --- | --- | --- |
| 1. Correcciones contenidas | A03, A04, A12; proyección compartida del catálogo y texto de pago | Casos reproducidos corregidos; capacidad/precio/categorías intactos; ambos métodos de pago; suite backend y frontend aprobadas |
| 2. Fuente comercial única | Snapshot de políticas verificado para respuestas y orquestación; eliminar importes hardcoded progresivamente | Cambiar mascota de 20 a 25 solo en fixtures debe actualizar todas las respuestas pertinentes; reglas ausentes/pendientes no producen cargos confirmados; aprobación humana preservada |
| 3. Preparar cierre WhatsApp | Decidir si se habilita la aprobación por Cloud API independientemente de coexistencia; feature flag explícita y verificación backend | Admin autorizado, staff rechazado; datos completos; cambios invalidan aprobación; grupos/multiunidad humanos; ensayo de reserva sin venta real en entorno aislado |
| 4. Consistencia de inventario | Conciliar reservas externas o integrar PMS/channel manager como proyecto separado | Escenarios de solapamiento, bloqueos y concurrencia; cero sobreventa en fixtures; ningún dato externo se presenta como consultado sin conexión real |
| 5. Transporte y operación | Errores terminales persistidos, CA/TLS, readiness útil y build reproducible | 401/403 no generan tormenta; 429/5xx recuperables; reinicio entre persistencia/entrega; certificado inválido rechazado; HTTP health rápido; instalación con lockfile |
| 6. Memoria y privacidad | Límites IG/FB, política de retención y revisión de datos enviados al proveedor | Presupuesto de tokens acotado en conversación larga; contexto de reserva/handoff preservado; sin limpieza automática antes de política y respaldo verificados |
| 7. Aceptación omnicanal | Conversaciones con contactos de prueba expresamente autorizados y supervisión humana | Entrada→persistencia→respuesta→estado por cada canal; cambio humano durante generación; reintento, duplicado y eventos fuera de orden; ningún envío a huéspedes sin autorización |

La coexistencia exige verificar la aprobación/capacidad real en Meta y los
eventos disponibles. No activar registro, cambiar número, tokens o suscripciones
para intentar resolver limitaciones de la UI. Con una instancia no se justifica
añadir Redis o reescribir la arquitectura; primero medir y cubrir los límites.

## 7. Correcciones preparadas y validación

Cambios en rama `fix/ai-catalog-payment-audit-20261105`:

1. `ai.catalog.js`: proyección de campos comerciales y normalización de
   referencias explícitas a números físicos de tres a cinco dígitos, acordes
   con el inventario actual. Conserva nombres Familiar 1/Familiar 2, camas,
   capacidad, precios y características. No modifica la base.
2. `ai.category-info.js` y `ai.service.js`: reutilizan la misma proyección antes
   de comparar categorías o entregar resultados al modelo. Es protección del
   catálogo, no un filtro universal de todo texto/historial generado por IA.
3. `ai.whatsapp-mvp.js`: opciones de pago con saltos de línea reales en español,
   inglés, portugués y francés.
4. Actualización de la nota operativa para distinguir controles manuales,
   aprobación de reserva y configuración de coexistencia.

Pruebas ejecutadas localmente con Node 24.22.1 y dependencias ya disponibles:

- Base anterior: 273 backend y 10 frontend aprobadas.
- Rama corregida: 277 backend y 10 frontend aprobadas, sin omitidas.
- Regresión de la descripción con número de unidad: oculta el identificador,
  conserva vista al mar/interior y precio, sin mutar el catálogo original.
- Proyección de tools: sin room ID, room number ni notas internas; datos
  comerciales preservados.
- Opciones de pago: tres líneas reales, importe correcto y selección presencial/
  Culqi para cuatro idiomas; aprobación previa y restricciones cubiertas por
  la suite existente.
- `git diff --check` sin errores de espacios.

No se ejecutó build completo del frontend local ni una llamada nueva a OpenAI,
un envío de Meta o una reserva de producción. La CI del PR debe confirmar
instalación limpia con lockfile, Node 22 y build frontend antes de fusionar.

Antes de desplegar: revisar diff/CI, confirmar SHA exacto y autorización de
producción. Después: comprobar deploy `live`, health y pruebas de aceptación
autorizadas. La reversión de estas correcciones es revertir el commit y
desplegar; no contienen migraciones ni requieren revertir datos.

## 8. Fuentes y límites de documentación externa

- Código de `main` en el SHA indicado; pruebas y migraciones del repositorio.
- Render: listado de servicio/deploys/logs/métricas y HTTP health real.
- Supabase: inventario, conteos de mensajes/consumo/conversaciones, políticas
  y permisos efectivos; solo agregados, sin cuerpos de mensajes ni contactos.
- Vercel: despliegue de producción READY y metadatos de commit.
- [OpenAI: estado de conversación](https://developers.openai.com/api/docs/guides/conversation-state):
  verificado el encadenamiento y el costo de contexto previo. El límite local
  no limita automáticamente una cadena remota.
- [OpenAI: function calling](https://developers.openai.com/api/docs/guides/function-calling):
  consultado para contrastar esquemas/herramientas.
- [Render: despliegues](https://render.com/docs/deploys) y
  [health checks](https://render.com/docs/health-checks): documentos HTML
  consultados tras no poder leer Markdown mediante el buscador.
- [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security):
  consultado con búsqueda oficial. Changelog revisado; sin cambios de esquema
  ni uso de CLI afectados por las novedades revisadas.
- Meta: se intentó consultar las referencias oficiales de coexistencia y
  `smb_message_echoes`; devolvieron HTTP 429. La búsqueda oficial no completó
  esa verificación. No se recomiendan permisos, versiones o activación nuevos
  basándose en documentación no accesible. Se conserva como pendiente revisar
  [la guía oficial de incorporación](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users)
  y [los ecos de mensajes](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes/).
