/**
 * Demostración aislada para la revisión del permiso whatsapp_business_messaging.
 * Usa exclusivamente el número de PRUEBA de Meta. Nunca cargar credenciales
 * del WhatsApp comercial. Servidor local, no exponerlo en Internet.
 */
import http from "node:http";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env.meta-review", import.meta.url)) });

const HOST = "127.0.0.1";
const PORT = 4310;
const ORIGIN = "http://" + HOST + ":" + PORT;
const token = process.env.WA_REVIEW_ACCESS_TOKEN || "";
const phoneId = process.env.WA_REVIEW_PHONE_NUMBER_ID || "";
const recipient = process.env.WA_REVIEW_RECIPIENT || "";
const csrf = crypto.randomBytes(24).toString("hex");
let sentCount = 0;
let lastSend = 0;

function validDigits(value) {
  return /^[1-9]\d{7,14}$/.test(value);
}

function configured() {
  return token.length > 20 && /^\d{6,24}$/.test(phoneId) && validDigits(recipient);
}

function page(status = "") {
  const info = {
    accepted: "Meta aceptó el envío. Comprueba que llegó a WhatsApp.",
    failed: "Meta rechazó el envío. Revisa el código indicado en la terminal.",
    wait: "Espera 15 segundos entre envíos. Máximo cinco envíos por ejecución.",
    invalid: "Configuración incompleta. Revisa .env.meta-review.",
    origin: "Solicitud bloqueada: abre http://127.0.0.1:4310/ directamente en Chrome o Edge, fuera de la vista previa de VS Code.",
    session: "Formulario anterior o inválido. Recarga la página desde http://127.0.0.1:4310/ y vuelve a intentar.",
  };
  const note = info[status] || "Usa exclusivamente el número de prueba asignado por Meta.";
  const masked = validDigits(recipient) ? "••••" + recipient.slice(-4) : "No configurado";
  return [
    "<!doctype html><html lang='es'><head><meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<title>Casa Huéspedes | Prueba WhatsApp Meta</title>",
    "<style>body{margin:0;background:#f1f6fa;color:#12314d;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}",
    "main{max-width:520px;width:100%;box-sizing:border-box;background:white;padding:34px;border-radius:18px;box-shadow:0 12px 32px #142f4e18}",
    "h1{font-size:27px;line-height:1.15;margin:0 0 10px}.label{color:#13744b;font-size:13px;font-weight:700;letter-spacing:.1em}",
    "p{line-height:1.6;color:#435569}.note{background:#edf5f5;padding:15px;border-radius:10px;margin:18px 0}",
    "button{width:100%;padding:15px;border:0;border-radius:10px;background:#135e4b;color:white;font-size:16px;font-weight:700;cursor:pointer}",
    "button:disabled{background:#9eabb4;cursor:not-allowed}small{display:block;margin-top:15px;color:#5b6f7f;line-height:1.5}",
    "</style></head><body><main>",
    "<div class='label'>CASA HUÉSPEDES PIMENTEL · DEMOSTRACIÓN</div>",
    "<h1>Envío desde nuestra aplicación</h1>",
    "<p>Prueba del permiso <strong>whatsapp_business_messaging</strong> para revisión de Meta. Este módulo local utiliza exclusivamente las credenciales del entorno de pruebas.</p>",
    "<p><strong>Destino autorizado:</strong> " + masked + "</p>",
    "<div class='note' role='status'>" + note + "</div>",
    "<form action='/send' method='POST'>",
    "<input type='hidden' name='csrf' value='" + csrf + "'>",
    "<button type='submit'" + (configured() ? "" : " disabled") + ">Enviar plantilla de prueba a WhatsApp</button>",
    "</form>",
    "<small>Plantilla oficial: hello_world (en_US). Después de enviar, muestra en la grabación el mensaje recibido en WhatsApp Web. El token nunca se muestra en la página.</small>",
    "</main></body></html>",
  ].join("\n");
}

function respond(res, status, httpCode = 200) {
  res.writeHead(httpCode, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.end(page(status));
}

async function sendTemplate() {
  const result = await fetch(
    "https://graph.facebook.com/v26.0/" + phoneId + "/messages",
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: { name: "hello_world", language: { code: "en_US" } },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    console.error("Meta HTTP:", result.status, "error code:", data.error?.code ?? "sin código");
    return false;
  }
  console.log("Solicitud de envío aceptada por Meta.");
  return true;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") return respond(res, configured() ? "" : "invalid");
  if (req.method !== "POST" || req.url !== "/send") return respond(res, "invalid", 404);
  if (req.headers.origin !== ORIGIN) {
    console.warn("POST /send bloqueado: Origin ausente o diferente al origen local esperado.");
    return respond(res, "origin", 403);
  }

  let body = "";
  for await (const chunk of req) {
    body += chunk.toString();
    if (body.length > 2048) {
      console.warn("POST /send bloqueado: formulario demasiado grande.");
      return respond(res, "session", 413);
    }
  }
  const submitted = new URLSearchParams(body).get("csrf");
  if (!configured()) {
    console.warn("POST /send bloqueado: variables de prueba incompletas.");
    return respond(res, "invalid", 403);
  }
  if (submitted !== csrf) {
    console.warn("POST /send bloqueado: código CSRF ausente o caducado.");
    return respond(res, "session", 403);
  }
  if (sentCount >= 5 || Date.now() - lastSend < 15000) return respond(res, "wait", 429);

  sentCount++;
  lastSend = Date.now();
  try {
    const success = await sendTemplate();
    return respond(res, success ? "accepted" : "failed");
  } catch (error) {
    console.error("Error de red:", error?.name || "desconocido");
    return respond(res, "failed", 502);
  }
});

server.listen(PORT, HOST, () => {
  console.log("Prueba Meta: " + ORIGIN);
  console.log("Solo para pruebas locales. No publiques este servidor.");
  if (!configured()) console.warn("Falta configurar .env.meta-review");
});
