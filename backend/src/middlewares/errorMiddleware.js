// Middleware global para manejar errores del backend
export function errorMiddleware(error, req, res, next) {
  // Mostramos el error completo en la terminal del backend
  console.error("ERROR BACKEND:", error);

  // Respondemos al frontend con un mensaje más claro en desarrollo
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Error interno del servidor",
    detail: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
}