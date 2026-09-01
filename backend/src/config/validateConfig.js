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
      env.meta.pageAccessToken
  );

  if (metaConfigured && !env.meta.verifyToken) {
    errors.push("Falta META_VERIFY_TOKEN para activar el webhook de Meta.");
  }

  if (metaConfigured && !env.meta.appSecret) {
    errors.push("Falta META_APP_SECRET para validar los webhooks de Meta.");
  }

  if (errors.length > 0) {
    const error = new Error(`Configuración inválida:\n- ${errors.join("\n- ")}`);
    error.code = "INVALID_CONFIGURATION";
    throw error;
  }
}
