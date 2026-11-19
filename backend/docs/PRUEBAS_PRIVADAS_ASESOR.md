# Conversaciones reales de prueba del asesor

El servidor ejecuta el mismo `generateAiReply` de atención al huésped y usa su
modelo OpenAI configurado y las fuentes vigentes. La cola está en el esquema
privado `advisor_qa`, sin permisos para `anon` ni `authenticated`, sin rutas HTTP
nuevas y sin extraer ni publicar claves de API. Solo un administrador SQL puede
crear una tanda en `advisor_qa.runs`.

Cada tanda fija `expected_commit` al SHA que se desea evaluar y contiene hasta
seis escenarios con un máximo agregado de veinte mensajes. Cada escenario indica
`name`, `channel` y `messages`. Los identificadores de conversación los genera el
servidor; el remitente de una prueba nunca es el de un cliente.

El contexto asíncrono de QA mantiene los borradores e historiales en memoria y
los separa de peticiones concurrentes de huéspedes. No utiliza `meta_messages`
ni guarda conversaciones de prueba en `ai_conversations`. El proceso no invoca
el transporte de Meta ni crea alertas al equipo. Las acciones transaccionales,
incluida la creación de reservas y el reporte de pagos, quedan bloqueadas. Los
datos e inventario del hotel se consultan sin modificarlos.

El trabajador revisa la cola durante la recuperación periódica del servidor.
No reintenta automáticamente una tanda interrumpida, para evitar consumo doble.
La tanda expira a los quince minutos y puede detenerse cambiando su estado a
`cancelled`. Solo se inician hasta cuatro tandas por ventana de veinticuatro horas.

Se permite un máximo de veinticuatro intentos de modelo por tanda, configurable
a la baja. `max_tokens` es un umbral comprobado antes de la siguiente llamada:
una llamada individual puede rebasarlo. La salida por llamada se limita a dos
mil tokens, respetando los límites menores que ya tenga el asesor.

`result` contiene la transcripción y el uso real informado por el proveedor:
tokens de entrada, salida, entrada en caché, intentos y respuestas completadas.
Una FAQ resuelta por código puede consumir cero tokens. Los errores del proveedor
se conservan como códigos sin sus mensajes técnicos ni credenciales. La prueba
no valida la entrega de mensajes, imágenes o enlaces a través de cada red social.

La definición de esquema está en `backend/database/private-ai-qa.sql` y se aplica
como migración del proyecto. Nunca se debe añadir este esquema al Data API ni
conceder permisos a clientes web. No hay endpoint público que active QA.

## Autorización excepcional de una sola tanda

El límite habitual sigue siendo cuatro tandas iniciadas por veinticuatro horas.
Solo después de una autorización explícita del usuario, un administrador SQL
puede añadir una autorización para el UUID exacto de una tanda en
`advisor_qa.run_authorizations`. La migración adicional está en
`backend/database/private-ai-qa-oneoff-authorization.sql`.

La autorización vence en un máximo de una hora y solo permite superar el límite
diario con hasta veinticuatro llamadas y un umbral de cuarenta y cinco mil tokens.
El contrato habitual sigue limitando la tanda a veinte mensajes y seis escenarios.
El servidor consume la autorización atómicamente al iniciar esa tanda. Se conserva
`consumed_at` como evidencia; reiniciar o reencolar la tanda no reutiliza el permiso.
Las demás tandas siguen sujetas al límite diario y todas las reglas de aislamiento.
No existe una opción HTTP, herramienta del asesor ni aprobación por texto del
huésped que pueda crear estas autorizaciones. Nunca se modifican fechas de tandas
anteriores para liberar cupo.
