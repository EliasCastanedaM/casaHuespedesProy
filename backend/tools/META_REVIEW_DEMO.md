# Demostración WhatsApp para Meta App Review (Casa Huéspedes)

Esta prueba **no cambia** la cuenta de WhatsApp Business del hotel, no instala intermediarios, no conecta Beds24 y no toca las reservas o base de datos. Solo envía la plantilla de prueba `hello_world` desde una pantalla propia ejecutada localmente.

## Antes de comenzar

1. En **Meta Developers → Conectar en WhatsApp → Paso 1. Pruébalo**, pulsa **Generar nuevo token**: el anterior quedó visible en una captura. **Nunca compartas ni grabes el token.**
2. Copia el **Phone Number ID del NÚMERO DE PRUEBA** (no el número comercial del hotel).
3. El destinatario debe estar en la lista de números de prueba autorizados en Meta y haber confirmado el permiso.
4. No subas credenciales a GitHub, no las pegues en ChatGPT y no las pongas en el frontend.

## Ejecutar localmente

Dentro de la carpeta `backend`:

```bash
npm ci
```

Crea el archivo **`backend/.env.meta-review`** a partir de `backend/.env.meta-review.example`, sustituyendo los valores por el token temporal recién generado, el ID del número de prueba y el número de WhatsApp del destinatario en formato internacional sin espacios ni `+`. El archivo real está excluido del repositorio por `backend/.gitignore`.

```bash
node tools/meta-review-demo.mjs
```

Abre **http://127.0.0.1:4310** en el navegador. Pulsa **Enviar plantilla de prueba a WhatsApp** y comprueba la recepción en WhatsApp Web o el celular. Si falla, consulta el código del error que aparece en la terminal; el secreto no se imprime.

## Video para `whatsapp_business_messaging`

- Abre en el computador la herramienta de Casa Huéspedes y WhatsApp Web del **destinatario**.
- Graba con el sistema operativo/OBS: pulsa enviar desde la herramienta y muestra el mensaje entrante en WhatsApp.
- Mantén ocultos tokens, números completos, información de clientes y pestañas privadas.
- Esta demostración muestra el envío desde **una interfaz propia del proyecto**. La aceptación final depende de los criterios de Meta; no garantiza aprobación.

## Seguridad y alcance

- El servidor escucha solamente en **127.0.0.1:4310** y no debe publicarse en Render/Vercel.
- La única plantilla permitida es `hello_world`, hasta cinco envíos por ejecución con espera entre envíos.
- Solo se envía al destinatario autorizado en `.env.meta-review`.
- No cambia las variables de entorno de Render ni las conexiones de Instagram o Facebook.
- No activa coexistencia: esa autorización y elegibilidad se verifican por separado.
- Para `whatsapp_business_management` se necesita **otra evidencia** que muestre creación/gestión de una plantilla; esta herramienta cubre únicamente el permiso de mensajería.

## Limpiar después de la prueba

Detén la herramienta con Ctrl+C, revoca o deja caducar el token temporal y elimina el archivo local `.env.meta-review` cuando hayas terminado. No mezclar credenciales del número comercial y de prueba.
