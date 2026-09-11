const AI_PROXY_URL = "/api/ai-chat";

function getErrorMessage(payload, fallback) {
  return payload?.message || payload?.error || fallback;
}

export async function sendAiMessage({ message, sessionId }) {
  const response = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "web",
      external_user_id: sessionId,
      message,
    }),
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "El asesor no devolvió una respuesta válida. Inténtalo nuevamente."
    );
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      getErrorMessage(
        payload,
        "No se pudo contactar al asesor. Inténtalo nuevamente."
      )
    );
  }

  const reply = payload?.data?.reply;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error(
      "El asesor no devolvió un mensaje. Inténtalo nuevamente."
    );
  }

  return reply.trim();
}
