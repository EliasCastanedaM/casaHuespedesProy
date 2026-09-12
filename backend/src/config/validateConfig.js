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

  if (errors.length > 0) {
    const error = new Error(`Configuración inválida:\n- ${errors.join("\n- ")}`);
    error.code = "INVALID_CONFIGURATION";
    throw error;
  }
}
