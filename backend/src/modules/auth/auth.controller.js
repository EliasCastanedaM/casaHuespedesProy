import { loginService } from "./auth.service.js";
import { revokeAdminSession, revokeAllAdminSessions } from "./auth.sessions.js";

export async function loginController(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Correo y contraseña son obligatorios.",
      });
    }

    const result = await loginService(email, password);

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      success: true,
      message: "Inicio de sesión correcto.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
export function currentSessionController(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    success: true,
    data: { user: req.user },
  });
}

export async function logoutController(req, res, next) {
  try {
    await revokeAdminSession(req.sessionId, req.user.id);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, message: "Sesión cerrada." });
  } catch (error) {
    next(error);
  }
}

export async function logoutAllController(req, res, next) {
  try {
    await revokeAllAdminSessions(req.user.id);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, message: "Todas las sesiones fueron revocadas." });
  } catch (error) {
    next(error);
  }
}
