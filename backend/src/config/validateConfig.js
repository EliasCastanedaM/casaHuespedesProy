import { env } from "./env.js";

export function validateProductionConfig() {
  const errors = [];

  if (!env.databaseUrl && !(env.db.host && env.db.name && env.db.user)) {
    errors.push("Configura DATABASE_URL o las variables DB_HOST, DB_NAME y DB_USER.");
  }

  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    errors.push("JWT_SECRET debe tener al menos 32 caracteres.");
  }

  if (
    env.nodeEnv === "production" &&
    env.frontendUrls.every((url) => url.includes("localhost"))
  ) {
    errors.push("Configura FRONTEND_URLS con el dominio público del frontend.");
  }

  const metaConfigured = Boolean(
    env.meta.verifyToken ||
      env.meta.appSecret ||
      env.meta.whatsappAccessToken ||
      env.meta.whatsappPhoneNumberId ||
      env.meta.facebookPageAccessToken ||
      env.meta.facebookPageId ||
      env.meta.instagramAccessToken ||
      env.meta.instagramAccountId
  );

  if (metaConfigured && !env.meta.verifyToken) {
    errors.push("Falta META_VERIFY_TOKEN para activar el webhook de Meta.");
  }

  if (metaConfigured && !env.meta.appSecret) {
    errors.push("Falta META_APP_SECRET para validar los webhooks de Meta.");
  }

  if (!/^v\d+\.\d+$/.test(env.meta.graphApiVersion)) {
    errors.push("META_GRAPH_API_VERSION debe tener un formato como v26.0.");
  }

  if (
    Boolean(env.meta.whatsappAccessToken) !==
    Boolean(env.meta.whatsappPhoneNumberId)
  ) {
    errors.push(
      "WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID deben configurarse juntos."
    );
  }

  if (
    Boolean(env.meta.facebookPageAccessToken) !==
    Boolean(env.meta.facebookPageId)
  ) {
    errors.push(
      "FACEBOOK_PAGE_ACCESS_TOKEN y FACEBOOK_PAGE_ID deben configurarse juntos."
    );
  }

  if (
    (env.meta.instagramAccountId &&
      !env.meta.instagramAccessToken &&
      !env.meta.facebookPageAccessToken) ||
    (env.meta.instagramAccessToken && !env.meta.instagramAccountId)
  ) {
    errors.push(
      "INSTAGRAM_ACCOUNT_ID requiere INSTAGRAM_ACCESS_TOKEN o FACEBOOK_PAGE_ACCESS_TOKEN."
    );
  }

  if (env.bookingAlert.testKeyPrefix &&
      !/^[-a-zA-Z0-9_]{8,48}$/.test(env.bookingAlert.testKeyPrefix)) {
    errors.push("BOOKING_ALERT_TEST_KEY_PREFIX tiene un formato inválido.");
  }

  if (env.bookingAlert.enabled) {
    if (!/^51\d{9}$/.test(env.bookingAlert.to.replace(/\D/g, ""))) {
      errors.push("BOOKING_ALERT_TO debe ser un celular peruano con código 51.");
    }
    if (!["template", "session_text"].includes(env.bookingAlert.mode)) {
      errors.push("BOOKING_ALERT_MODE debe ser template o session_text.");
    }
    if (env.bookingAlert.mode === "template" &&
        !/^[a-z0-9_]{1,512}$/.test(env.bookingAlert.templateName)) {
      errors.push("Configura BOOKING_ALERT_TEMPLATE_NAME con una plantilla aprobada en Meta.");
    }
    if (env.bookingAlert.mode === "session_text" && env.bookingAlert.testKeyPrefix) {
      errors.push("No combines modo session_text con un prefijo de prueba.");
    }
    if (env.bookingAlert.mode === "session_text" &&
        (!/^51\d{9}$/.test(env.bookingAlert.pilotSource) ||
         env.bookingAlert.pilotSource !== env.bookingAlert.to.replace(/\D/g, ""))) {
      errors.push("El modo session_text requiere que BOOKING_ALERT_PILOT_SOURCE coincida con BOOKING_ALERT_TO.");
    }
    if (!env.meta.whatsappAccessToken || !env.meta.whatsappPhoneNumberId) {
      errors.push("Las alertas requieren WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.");
    }
  }

  if (errors.length > 0) {
    const error = new Error(`Configuración inválida:\n- ${errors.join("\n- ")}`);
    error.code = "INVALID_CONFIGURATION";
    throw error;
  }
}
