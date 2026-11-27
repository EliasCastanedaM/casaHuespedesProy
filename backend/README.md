# Backend Casa Huéspedes Pimentel

API de reservas, panel administrativo y asesor IA compartido por WhatsApp,
Instagram, Facebook y la integración interna de chat. Esta guía describe el
código actual; los informes fechados documentan revisiones históricas.

## Desarrollo y verificación

Usar Node 22 (la versión probada en CI). Instalar con el lockfile:

```sh
npm ci --ignore-scripts
cp .env.example .env
npm run dev
```

`npm run dev` usa `node --watch`, sin nodemon. Configurar las variables privadas
solo en el entorno correspondiente. No copiar credenciales al frontend ni a Git.
`npm start` inicia el servidor y sus tareas periódicas: no usarlo para pruebas
locales contra una base de producción.

```sh
npm test
npm audit
```

`npm test` ejecuta `test/*.test.js`; excluye fixtures y helpers del conteo.
Las suites basadas en datos de noviembre fijan su reloj mediante
`test/helpers/booking-fixture-clock.js`. Las regresiones de fronteras temporales
usan fechas explícitas y cubren cambio de día en Lima, rangos inválidos y años.
Las pruebas con proveedores/base simulados no miden precisión semántica.

## Arquitectura del asesor

- `ai.prompt.js`: contrato conversacional común. Los clasificadores e intérpretes
  auxiliares tienen contratos especializados en sus propios módulos.
- `ai.service.js`: enrutamiento, FAQ, solicitudes múltiples, interpretación,
  fuentes oficiales y herramientas de lectura.
- `ai.reservation.js`: borrador, consentimiento explícito, revisión y acciones.
- `ai.occupancy-pricing.js`: cálculo por ocupación, camas y preferencias.
- `booking.service.js`: revalidación, idempotencia y registro transaccional.
- `meta.service.js`: atención humana, outbox, entregas parciales y recuperación.

El asesor atiende **24/7**: `isAiServiceTime()` devuelve `true`. Las variables
históricas `AI_SERVICE_START/END` no limitan actualmente el horario. Un operador
puede tomar el chat y pausar las respuestas automáticas.

Las preguntas informativas no crean reservas ni eligen medios de pago. La oferta
requiere aceptación explícita; después el equipo verifica disponibilidad y aprueba.
Solo el flujo autorizado del backend puede registrar una reserva o un aviso de
pago. Reportar un pago manual no verifica el movimiento.

## Memoria

El estado de reserva se conserva en `ai_conversations`, separado del historial,
con TTL de 24 horas. El historial pertinente se recupera de `meta_messages`.
La generación abierta utiliza hasta ocho mensajes y 3.200 caracteres históricos.
No se reutiliza `previous_response_id` entre turnos; sí dentro de una continuación
de herramientas. Hay respaldo temporal en memoria si falla PostgreSQL, que no
sustituye la persistencia ni constituye aprendizaje automático.

## Reglas comerciales y propuestas

La política implementada de cargos está en
`src/modules/commercial/operationalPolicy.js`. El código usa S/ 20 por niño de
5–8 años y por mascota/noche mientras siga vigente la versión anterior.
Los datos publicados requieren fuente verificada y coincidencia con el cálculo.
Si una regla tiene otro importe o frecuencia, el asesor no publica ese cargo y
la aprobación del panel se bloquea hasta actualizar conjuntamente el cálculo.
Se pueden presentar propuestas para revisión; no equivalen a activación.

El tarifario del PDF del 15/11/2026 continúa **pendiente de confirmación** en
`src/config/tariffProposal.js`. Su fórmula, mínimos, correspondencias y temporadas
no se activan desde el chat ni por una aprobación comercial genérica.
Consultar `docs/TARIFARIO_PENDIENTE_ACTIVACION.md` antes de proponer su activación.

## Acceso y canales

| Ruta | Acceso | Uso |
| --- | --- | --- |
| GET `/api/health` | Público | Salud del proceso y SHA informado |
| POST `/api/auth/login` | Público limitado | Sesión administrativa |
| POST `/api/ai/chat` | Token interno obligatorio | Integración servidor a servidor |
| GET/POST `/api/meta/webhook` | Verificación/firma Meta | WhatsApp, Instagram y Facebook |
| `/api/admin/commercial/*` | Sesión; aprobación solo admin | Reglas y propuestas comerciales |

`/api/ai/chat` deniega acceso cuando `AI_INTERNAL_TOKEN` no está configurado o no
coincide con `x-ai-token`. Nunca poner ese token en un navegador público.
Las sesiones del panel son revocables y el rol vigente se consulta en el servidor.
El transporte directo de TikTok no está implementado; aceptar su etiqueta en el
endpoint interno no demuestra una integración de mensajería con TikTok.

## Base de datos y publicación

`database/schema.sql` describe el esquema inicial. El historial posterior reside
en `database/migrations/`; los scripts de seguridad, propuestas y QA tienen sus
propias instrucciones. No basta con aplicar únicamente la migración inicial.
Revisar migraciones aplicadas, dependencias y recuperación en el entorno destino;
no ejecutar seeds, propuestas o SQL en producción como parte de las pruebas.

Los cambios se revisan en una rama y PR. No fusionar ni desplegar hasta contar con
la autorización correspondiente. La verificación de salud por SHA es una prueba
de despliegue, no una evaluación de calidad conversacional ni de entrega Meta.

## Evaluación real y QA privado

Ver `docs/INTERPRETACION_IA_CASA_HUESPEDES.md` para el evaluador semántico y
`docs/PRUEBAS_PRIVADAS_ASESOR.md` para el worker aislado. Necesitan el modelo y
credenciales gestionados en el servidor, con presupuesto autorizado; no deben
usarse datos privados de huéspedes sin revisión. QA bloquea las transacciones y
el transporte, pero lee fuentes del hotel: no es un snapshot de inventario.

La estabilización, sus pruebas y limitaciones se describen en
`docs/ESTABILIZACION_LINEA_BASE_2026-11-27.md`.
