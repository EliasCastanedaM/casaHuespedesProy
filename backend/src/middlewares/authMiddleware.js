import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getActiveAdminSession } from "../modules/auth/auth.sessions.js";

export async function requireAdminAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para realizar esta acción.",
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "casa-huespedes-pimentel",
      audience: "hotel-admin",
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "La sesión venció o no es válida. Inicia sesión nuevamente.",
    });
  }

  try {
    const user = await getActiveAdminSession(payload.sid, payload.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "La sesión fue revocada o venció. Inicia sesión nuevamente.",
      });
    }
    req.user = user; // Rol vigente desde PostgreSQL, no desde un JWT antiguo.
    req.sessionId = payload.sid;
    return next();
  } catch (error) {
    // Fallo de BD: denegar por defecto, conservando observabilidad del 503/500.
    return next(error);
  }
}

// Usar después de requireAdminAuth. Nunca confiar en el rol enviado en el body.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción.",
      });
    }
    return next();
  };
}

export const requireAdminRole = requireRole("admin");
