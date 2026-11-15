# Servicios: respuestas del asesor y página pública

La consulta a la base del proyecto confirmó que los servicios proporcionados por el responsable estaban activos y aprobados. El reconocimiento de consultas generales omitía el singular «tiene»: «qué servicios tiene el hotel» se clasificaba como servicio específico sin coincidencia y terminaba en una respuesta de incertidumbre.

## Comportamiento

- Las consultas generales comparten una frase breve y `https://www.casahuespedespimentel.com/servicios`, sin enumeraciones ni cantidades. El enlace no depende de una consulta SQL ni del modelo. Las llamadas a `listar_servicios` mantienen el mismo contrato para consultas generales.
- Las preguntas específicas siguen consultando el catálogo vigente y responden directamente con las condiciones del tema solicitado. No se sustituyen por un enlace al catálogo.
- Aire acondicionado no figura como servicio confirmado. Solo cuando el catálogo confirma ventiladores se comunica esa alternativa pertinente, sin afirmar ausencia de aire acondicionado. Una consulta por piscina o por otro servicio sin fuente no provoca una lista de servicios ajenos.
- Las consultas informativas mantienen el borrador de reserva y no piden identidad ni alteran pagos o disponibilidad.

## Página pública

La ruta `/servicios` ya existía, pero no figuraba en el menú principal y tenía un listado básico. Ahora conserva la identidad crema, chocolate y cobre del sitio y usa fotografías reales de la terraza. Distribuye el catálogo del mismo endpoint público en alojamiento, espacios compartidos, servicios adicionales e información práctica. Los cargos y condiciones proceden de la fuente; un precio no especificado no se presenta como gratuito.

Se añadió acceso desde el menú de escritorio y móvil y desde el pie. La cafetería dejó de aparecer como servicio incluido en la portada: se muestra el desayuno continental incluido aprobado por el responsable.

## Validación

Pruebas de las frases de la captura, consultas generales en español e inglés, respuestas específicas, fuentes ausentes, cobros, autorización y preservación de reserva en WhatsApp, Facebook e Instagram. Compilación del frontend y pruebas existentes de calendario y control humano de mensajes.

La vista previa permitió observar el encabezado, las fotografías y el estado de error de carga. La revisión completa del catálogo en esa vista quedó limitada por la política del navegador; no se presenta como una prueba visual completa. Los cambios locales de configuración utilizados para QA se retiraron antes de publicar. La publicación se verifica con los controles de despliegue y la versión exacta de backend.
