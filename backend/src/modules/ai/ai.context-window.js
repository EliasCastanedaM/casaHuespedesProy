// Ventana acotada de conversación para las solicitudes sin contexto remoto.
// Los estados de reserva sensibles se conservan en Supabase, no en un hilo
// ilimitado de Responses. No se eliminan los datos del mensaje actual.
export function responseInput(history, message, {
  maxHistoryMessages = 10,
  maxHistoryCharacters = 4_000,
} = {}) {
  const current = String(message ?? "");
  const recent = (Array.isArray(history) ? history : [])
    .filter((item) => typeof item?.content === "string" && item.content.trim())
    .slice(-Math.max(0, maxHistoryMessages));
  if (recent.length && recent.at(-1).author === "client" &&
      recent.at(-1).content.trim() === current.trim()) {
    recent.pop();
  }

  let remaining = Math.max(0, maxHistoryCharacters);
  const kept = [];
  // Prefiere turnos completos y recientes a fragmentos antiguos de un mensaje.
  for (let i = recent.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const content = recent[i].content.trim();
    if (content.length > remaining) break;
    kept.unshift({
      role: recent[i].author === "client" ? "user" : "assistant",
      content,
    });
    remaining -= content.length;
  }
  kept.push({ role: "user", content: current });
  return kept;
}

export function shouldReuseOpenAiResponseId(channel, previousResponseId) {
  // En WhatsApp, conversaciones de varios días podían reintroducir miles de
  // tokens aunque el historial visible ya se hubiera limitado.
  return channel !== "whatsapp" && Boolean(previousResponseId);
}
