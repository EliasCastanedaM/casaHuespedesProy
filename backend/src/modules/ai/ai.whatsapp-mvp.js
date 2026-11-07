// Compatibility exports for existing integrations; all logic is global.
export {
  handleGlobalReservationTurn as handleWhatsAppMvpTurn,
  prepareGlobalReservation as prepareWhatsAppMvpReservation,
  formatGlobalHandoffSummary as formatWhatsAppHandoffSummary,
  isAssistantMenuRequest as isWhatsAppMenuRequest,
} from "./ai.reservation.js";
