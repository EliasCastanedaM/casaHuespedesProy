import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAdminAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Debes iniciar sesión para realizar esta acción.",
      });
    }

    const payload = jwt.verify(token, env.jwtSecret);

    if (!["admin", "staff"].includes(payload.role)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción.",
      });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "La sesión venció o no es válida. Inicia sesión nuevamente.",
    });
  }
}
