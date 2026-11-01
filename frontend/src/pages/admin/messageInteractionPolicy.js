// Políticas de interacción del panel: independiente de Embedded Signup/coexistencia.
// La activación de la aplicación WhatsApp Business del celular NO se controla aquí.
export function canChangeConversationMode(conversation, saving = false) {
  return Boolean(conversation && !saving && !conversation.resolved_at);
}

export function canChangeConversationResolution(conversation, saving = false) {
  return Boolean(conversation && !saving);
}

export function canComposeManualMessage(conversation, saving = false) {
  return Boolean(conversation && !saving && !conversation.resolved_at &&
    conversation.handoff_active === true);
}

export function canSendManualMessage(conversation, saving = false, draft = "") {
  return canComposeManualMessage(conversation, saving) &&
    Boolean(String(draft).trim());
}
