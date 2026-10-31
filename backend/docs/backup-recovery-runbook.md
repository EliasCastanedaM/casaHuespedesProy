# Respaldos y recuperación — Casa Huéspedes Pimentel

**Evaluación:** 30/10/2026. **Estado:** procedimiento preparado, **sin evidencia aún de una copia restaurable**. Este documento no habilita borrados ni programas acciones sobre producción.

## Contexto confirmado

- Supabase: `casa-huespedes-pimentel` (ref `kjwaqrmhoeftxafedpae`), organización **Free**.
- PostgreSQL 17.6; base ~15 MB; 34 tablas `public`, todas con RLS. 14 restricciones FK, ninguna sin validar.
- El plan Free **no garantiza respaldos diarios restaurables en el panel**. Supabase recomienda exportaciones propias mediante `supabase db dump` y almacenamiento fuera del proyecto.
- Tablas internas de nombre `*_backup_*` o `*_archive_*` no protegen contra pérdida del proyecto completo.
- El alcance incluye reservas, pagos, huéspedes, consultas, inventario, mensajes Meta, contextos IA, sesiones y deduplicación. El respaldo SQL **no recupera los archivos físicos** en Cloudinary ni Supabase Storage.

## Propuesta operativa (requiere aprobación)

| Elemento | Criterio inicial | Evidencia de éxito |
| --- | --- | --- |
| PostgreSQL | Exportación lógica diaria; mayor frecuencia si la pérdida tolerable es menor a 24 horas | Conjunto `roles/schema/data`, hash e inventario |
| Custodia | Almacenamiento cifrado fuera de GitHub, Render y la propia base; permisos mínimos | Copia recuperable, clave custodiada separadamente |
| Conservación | 7 copias diarias y 4 semanales; sujeto a evaluación legal y operativa | Inventario y depuración aprobada |
| Recuperación | Ensayo mensual en entorno aislado sin conexión a Meta/Brevo | Importación completa, comparaciones y prueba funcional |
| RPO/RTO | Por acordar según operación del hotel | Medición real de un ensayo, no promesa |

**Ninguna automatización, purga o nueva suscripción está habilitada.** Antes de elegir frecuencia/retención, coordinar datos personales y costo del almacenamiento.

## 1. Exportación desde Windows PowerShell (estación de trabajo autorizada)

Instalar y verificar las versiones de **Supabase CLI**, **Docker Desktop** y **PostgreSQL/psql**. Ejecutar `supabase --help` y `supabase db dump --help` para comprobar argumentos disponibles. Obtener la cadena de la base en Supabase Dashboard > **Connect**: directa con IPv6, o *session pooler* cuando sea necesario. Nunca incluir claves en issues, código, capturas ni mensajes.

Desde `backend/`:

```powershell
New-Item -ItemType Directory -Force .backup | Out-Null
# Cargar $env:BACKUP_DB_URL desde un gestor de secretos local y seguro.
# No se muestra ni se almacena la contraseña en Git.
$env:DATABASE_URL = $env:BACKUP_DB_URL
node scripts/backup-readiness.mjs capture
supabase db dump --db-url "$env:BACKUP_DB_URL" -f .backup/roles.sql --role-only
supabase db dump --db-url "$env:BACKUP_DB_URL" -f .backup/schema.sql
supabase db dump --db-url "$env:BACKUP_DB_URL" -f .backup/data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
Get-FileHash .backup/roles.sql,.backup/schema.sql,.backup/data.sql -Algorithm SHA256
```

La utilidad `backup-readiness.mjs` solo genera un manifiesto JSON de **conteos agregados y controles RLS/FK** en `backend/.backup`. No lee ni imprime nombres, teléfonos, mensajes o documentos. Usa una transacción `READ ONLY` y termina con `ROLLBACK`. El **dump es una operación separada** de la CLI y sí contiene datos personales.

**Acciones obligatorias después de la exportación:** comprobar que los tres archivos existen y no están vacíos; cifrarlos con una herramienta confiable (algoritmo moderno), custodiar la clave fuera del archivo, subir únicamente las copias cifradas al destino aprobado y registrar hashes, fecha y responsable en inventario privado. Probar lectura y descifrado. Borrar copias temporales en claro con el procedimiento de la organización. No subir los archivos a GitHub ni compartirlos por mensajería.

La toma de manifiesto y el dump pueden reflejar instantes distintos si entran nuevos mensajes mientras se exporta. Registrar la ventana de actividad y no interpretar una diferencia de conteos como corrupción sin investigar. No apagar WhatsApp Business ni los webhooks de Meta por esta tarea.

## 2. Ensayo de restauración (sin producción)

1. Crear o habilitar **un destino nuevo y aislado**, con PostgreSQL compatible, previa autorización si acarrea costo. No conectar teléfonos reales, webhooks Meta, Brevo, Cloudinary, OpenAI ni trabajos programados a esa base.
2. Verificar hashes y descifrar el respaldo **solo** en un equipo autorizado. Configurar extensiones necesarias; revisar el uso de Vault y las claves raíz: las copias lógicas no garantizan descifrado en otro proyecto sin los procedimientos correspondientes.
3. Restaurar `roles.sql`, `schema.sql` y `data.sql` exclusivamente en ese destino con `psql --single-transaction --variable ON_ERROR_STOP=1`, conforme a la guía oficial; ajustar los roles y privilegios necesarios. **Nunca probar sobre `kjwaqrmhoeftxafedpae`.**
4. Establecer `DATABASE_URL` apuntando a la BD aislada. Desde `backend/` ejecutar:

```powershell
$env:RESTORE_TEST_CONFIRMED = "true"
node scripts/backup-readiness.mjs verify .backup/baseline-FECHA.json
```

5. Revisar tablas y RLS, validación de FK, recuentos críticos, integridad de relaciones de reservas/clientes/habitaciones y de mensajes/conversaciones/deduplicación. Investigar diferencias si hubo escrituras entre el manifiesto y la exportación. Ejecutar pruebas funcionales **sin envío de mensajes ni correos reales**.
6. Documentar restauración, duración, errores y resultado (sin PII en las evidencias). Destruir datos de ensayo según la política aprobada.

**Importante:** que coincidan los conteos no prueba por sí solo que el backup se pueda recuperar. El procedimiento se considera validado únicamente después de una importación completa y pruebas de integridad y funcionamiento en entorno aislado.

## 3. Respuesta ante pérdida de datos

1. Preservar evidencias y determinar alcance, momento y dependencias afectadas. Coordinar cualquier pausa de escrituras con la operación del hospedaje; no eliminar ni desactivar mensajes/handoff automáticamente.
2. Seleccionar la última **copia efectivamente restaurada y verificada**, inspeccionándola primero en un destino nuevo.
3. Conciliar reservas/pagos, estados de atención humana y mensajes ya procesados antes de reactivar bots o notificaciones; evitar duplicación y reenvíos indebidos.
4. Aprobar expresamente cualquier restauración en producción; registrar responsable, ventana, impactos y comprobaciones posteriores.
5. Evaluar notificaciones y obligaciones aplicables si existe incidente de seguridad o datos personales.

## 4. Pendientes

- **No confirmado:** ningún archivo de backup independiente ni una restauración exitosa; no declarar datos protegidos contra pérdida total.
- Falta definir destino de copias cifradas, frecuencia, custodio y retención aprobados.
- Respaldar por separado imágenes y vídeos en Cloudinary, objetos de Supabase Storage y configuraciones externas relevantes.
- No limpiar todavía los contextos IA vencidos ni payloads de coexistencia.
- No activar recuperación de contraseña del administrador hasta que el frontend de Vercel requerido esté publicado y probado.

## Referencias oficiales

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/guides/platform/clone-project
