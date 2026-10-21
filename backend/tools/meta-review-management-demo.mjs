/**
 * Demostración local para revisión de whatsapp_business_management.
 * Crea UNA plantilla a través de Graph API en la cuenta de PRUEBA de Meta.
 * Nunca usar la WABA comercial de Casa Huéspedes.
 *
 * Uso: desde backend, ejecutar node tools/meta-review-management-demo.mjs
 * y abrir http://127.0.0.1:4311/ en Chrome/Edge.
 */
import http from "node:http";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env.meta-review", import.meta.url)) });

const HOST = "127.0.0.1";
const PORT = 4311;
const ORIGIN = "http://" + HOST + ":" + PORT;
const GRAPH_VERSION = "v26.0";
// Cuenta de mensajes DE PRUEBA que mostró Meta en Paso 1 (no cuenta comercial).
const TEST_WABA_ID = "1740716227033716";
const token = String(process.env.WA_REVIEW_ACCESS_TOKEN || "").trim();
const wabaId = String(process.env.WA_REVIEW_WABA_ID || "").trim();
const csrf = crypto.randomBytes(24).toString("hex");
const template = {
  name: "chp_revision_management_video_20261021",
  language: "es",
  category: "UTILITY",
  components: [{
    type: "BODY",
    text: "Casa Huéspedes Pimentel: hemos recibido tu solicitud de reserva. Nuestro equipo revisará la información y te responderá pronto."
  }]
};

let attempts = 0;
let outcome = "Este módulo no envía mensajes a huéspedes. Solo crea una plantilla en la cuenta de prueba de Meta.";

function configured() {
  return token.length > 20 && wabaId === TEST_WABA_ID;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function render() {
  const message = configured()
    ? outcome
    : "Configuración incompleta o WABA no autorizada. Comprueba WA_REVIEW_WABA_ID de la cuenta DE PRUEBA.";
  return [
    "<!doctype html><html lang='es'><head><meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width,initial-scale=1'>",
    "<title>Casa Huéspedes | Revisión de administración WhatsApp</title>",
    "<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:#f1f6fa;color:#12314d;font:16px system-ui,sans-serif}main{background:white;max-width:630px;width:100%;box-sizing:border-box;padding:34px;border-radius:18px;box-shadow:0 12px 32px #142f4e18}h1{font-size:26px;line-height:1.2}p{line-height:1.55}small{color:#456;line-height:1.5}button{width:100%;border:0;border-radius:10px;padding:15px;background:#135e4b;color:white;font-size:16px;font-weight:bold;cursor:pointer}button:disabled{background:#a3afb8;cursor:not-allowed}.label{color:#13744b;font-size:12px;font-weight:bold;letter-spacing:.1em}.note{padding:15px;background:#edf5f5;border-radius:10px;margin:18px 0}.preview{padding:16px;border:1px solid #d0dbe1;border-radius:10px}</style>",
    "</head><body><main><div class='label'>CASA HUÉSPEDES PIMENTEL · DEMOSTRACIÓN LOCAL</div>",
    "<h1>Administración de plantillas WhatsApp</h1>",
    "<p>Prueba del permiso <strong>whatsapp_business_management</strong>. Esta aplicación crea una plantilla mediante Graph API, exclusivamente para la cuenta de prueba.</p>",
    "<p><strong>Cuenta de prueba:</strong> ••••" + TEST_WABA_ID.slice(-4) + "</p>",
    "<div class='preview'><strong>Nombre:</strong> " + escapeHtml(template.name) +
      "<p><strong>Categoría:</strong> Utilidad · <strong>Idioma:</strong> Español</p><p>" +
      escapeHtml(template.components[0].text) + "</p></div>",
    "<div class='note' role='status'>" + escapeHtml(message) + "</div>",
    "<form action='/create' method='POST'><input type='hidden' name='csrf' value='" + csrf + "'>",
    "<button type='submit'" + (!configured() || attempts > 0 ? " disabled" : "") +
      ">Crear plantilla de prueba mediante API</button></form>",
    "<p><small>Máximo un intento por ejecución. La plantilla queda sujeta a revisión de Meta. No se muestran tokens ni se usa el número comercial.</small></p>",
    "</main></body></html>"
  ].join("\n");
}

function reply(res, code = 200) {
  res.writeHead(code, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-frame-options": "DENY",
    "referrer-policy": "same-origin",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  });
  res.end(render());
}

async function createTemplate() {
  const response = await fetch(
    "https://graph.facebook.com/" + GRAPH_VERSION + "/" + wabaId + "/message_templates",
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json"
      },
      body: JSON.stringify(template),
      signal: AbortSignal.timeout(20000)
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = Number(data?.error?.code) || 0;
    const subcode = Number(data?.error?.error_subcode) || 0;
    console.error("Meta rechazó la creación. HTTP:", response.status,
      "código:", code, "subcódigo:", subcode);
    return "Meta rechazó la creación: HTTP " + response.status +
      ", código " + code + ", subcódigo " + subcode +
      ". Revisa en Meta el permiso whatsapp_business_management y el ID de cuenta de prueba.";
  }
  const id = /^\d+$/.test(String(data.id || "")) ? String(data.id) : "no devuelto";
  const status = /^[A-Z_]+$/.test(String(data.status || ""))
    ? String(data.status) : "recibida";
  console.log("Meta aceptó la creación de la plantilla. Estado:", status);
  return "Meta aceptó la solicitud de creación. ID de plantilla: " + id +
    ". Estado: " + status + ". Comprueba la nueva plantilla en WhatsApp Manager.";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") return reply(res);
  if (req.method !== "POST" || req.url !== "/create") return reply(res, 404);
  if (req.headers.origin !== ORIGIN) {
    outcome = "Origen de formulario no permitido. Abre el sitio directamente en http://127.0.0.1:4311/";
    return reply(res, 403);
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk.toString("utf8");
    if (body.length > 2048) {
      outcome = "Formulario demasiado grande.";
      return reply(res, 413);
    }
  }
  if (new URLSearchParams(body).get("csrf") !== csrf) {
    outcome = "Sesión no válida. Recarga la página y vuelve a probar.";
    return reply(res, 403);
  }
  if (!configured()) {
    outcome = "Cuenta no autorizada. Se permiten únicamente credenciales y WABA de prueba.";
    return reply(res, 403);
  }
  if (attempts !== 0) return reply(res, 429);
  attempts++;
  try {
    outcome = await createTemplate();
    return reply(res);
  } catch (error) {
    console.error("Fallo de comunicación con Meta:", error?.name || "Error");
    outcome = "Error de comunicación con Meta. Revisa tu conexión o si el token temporal ha expirado.";
    return reply(res, 502);
  }
});

server.listen(PORT, HOST, () => {
  console.log("Revisión de administración WhatsApp: " + ORIGIN);
  console.log("Solo cuenta DE PRUEBA, sin envíos ni cambios en producción.");
  if (!configured()) console.warn("Falta configurar WA_REVIEW_WABA_ID de la cuenta DE PRUEBA o el token.");
});
