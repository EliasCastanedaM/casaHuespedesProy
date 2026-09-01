import { rateLimit } from "express-rate-limit";

const common = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
};

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 400,
  message: {
    success: false,
    message: "Demasiadas solicitudes. Inténtalo nuevamente en unos minutos.",
  },
});

export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message: "Demasiados intentos de acceso. Espera unos minutos.",
  },
});

export const aiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 30,
  message: {
    success: false,
    message: "El asesor recibió demasiados mensajes. Inténtalo en un minuto.",
  },
});
