// Middleware global para manejar errores del backend sin registrar datos sensibles.
function safeErrorCode(value) {
  const normalized = String(value ?? "");
  return /^[A-Z0-9_-]{1,40}$/i.test(normalized) ? normalized : null;
}

export function errorMiddleware(error, req, res, next) {
  const uploadLimitExceeded = error?.name === "MulterError" &&
    ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE", "LIMIT_FIELD_COUNT"].includes(error.code);
  const statusCode = uploadLimitExceeded
    ? (error.code === "LIMIT_UNEXPECTED_FILE" ? 400 : 413)
    : Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const routePath = typeof req.route?.path === "string" ? req.route.path : null;

  // No registrar error.message, stack, URL original, query params ni body:
  // pueden contener teléfonos, tokens, WAMID o contenido del huésped.
  console.error(JSON.stringify({
    component: "http_error",
    method: String(req.method || "").slice(0, 10),
    baseUrl: String(req.baseUrl || "").slice(0, 100),
    route: routePath,
    statusCode,
    errorType: String(error?.name || "Error").slice(0, 80),
    ...(safeErrorCode(error?.code) ? { errorCode: safeErrorCode(error.code) } : {}),
  }));

  const isDevelopment = process.env.NODE_ENV === "development";
  const message = uploadLimitExceeded
    ? "El lote de archivos supera los límites de cantidad o tamaño admitidos."
    : statusCode < 500 ? error?.message || "Solicitud no válida" : "Error interno del servidor";
  const payload = { success: false, message };

  if (isDevelopment && error?.stack) {
    payload.detail = error.stack;
  }

  return res.status(statusCode).json(payload);
}
