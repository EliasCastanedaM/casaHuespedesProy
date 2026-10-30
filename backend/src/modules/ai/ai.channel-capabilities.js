// Una integración de mensajería no equivale a inventario conciliado.
// Exigir ambas aprobaciones operativas: activar el canal por sí solo no basta.
export function canUseWhatsAppDirectBooking(aiConfig = {}) {
  return aiConfig.whatsappDirectBookingEnabled === true &&
    aiConfig.channelInventoryVerified === true;
}
