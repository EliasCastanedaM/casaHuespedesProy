const DEFAULT_BACKEND_API_URL =
  "https://casa-real-huespedes-backend.onrender.com/api";

function getBackendEndpoint() {
  const configuredUrl = String(
    process.env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL
  )
    .trim()
    .replace(/\/+$/, "");

  return configuredUrl.endsWith("/api")
    ? `${configuredUrl}/ai/chat`
    : `${configuredUrl}/api/ai/chat`;
}

function sendJson(response, statusCode, payload) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(statusCode).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      success: false,
      message: "Método no permitido.",
    });
  }

  const message = String(request.body?.message || "").trim();
  const externalUserId = String(
    request.body?.external_user_id || request.body?.session_id || ""
  ).trim();

  if (!externalUserId || externalUserId.length > 160) {
    return sendJson(response, 400, {
      success: false,
      message: "No se pudo iniciar la sesión del asesor.",
    });
  }

  if (!message || message.length > 4000) {
    return sendJson(response, 400, {
      success: false,
      message: "El mensaje es obligatorio y admite hasta 4000 caracteres.",
    });
  }

  const aiToken = String(process.env.AI_INTERNAL_TOKEN || "").trim();

  if (!aiToken) {
    return sendJson(response, 503, {
      success: false,
      message: "El asesor todavía no está configurado en este entorno.",
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

  try {
    const backendResponse = await fetch(getBackendEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ai-token": aiToken,
      },
      body: JSON.stringify({
        channel: "web",
        external_user_id: externalUserId,
        message,
      }),
      signal: controller.signal,
    });

    const responseText = await backendResponse.text();
    let payload;

    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = {
        success: false,
        message: "El asesor no devolvió una respuesta válida.",
      };
    }

    if (backendResponse.status === 401 || backendResponse.status === 403) {
      return sendJson(response, 503, {
        success: false,
        message: "El asesor no está configurado correctamente.",
      });
    }

    return sendJson(response, backendResponse.status, payload);
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    return sendJson(response, timedOut ? 504 : 502, {
      success: false,
      message: timedOut
        ? "El asesor tardó demasiado en responder. Inténtalo nuevamente."
        : "No se pudo conectar con el asesor. Inténtalo nuevamente.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
