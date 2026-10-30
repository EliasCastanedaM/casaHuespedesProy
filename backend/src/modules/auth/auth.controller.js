import { loginService } from "./auth.service.js";
import { env } from "../../config/env.js";
import { changeAdminPassword, requestAdminPasswordRecovery, confirmAdminPasswordRecovery } from "./auth.passwords.js";
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

export async function changePasswordController(req, res, next) {
  try {
    await changeAdminPassword(req.user.id, req.body?.currentPassword, req.body?.newPassword);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, message: "Contraseña actualizada. Todas las sesiones han sido revocadas." });
  } catch (error) {
    return next(error);
  }
}

export async function requestPasswordRecoveryController(req, res, next) {
  try {
    await requestAdminPasswordRecovery(req.body?.email);
    res.setHeader("Cache-Control", "no-store");
    return res.status(202).json({
      success: true,
      message: "Si el correo corresponde a una cuenta y la recuperación está habilitada, recibirás instrucciones.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmPasswordRecoveryController(req, res, next) {
  try {
    if (!env.auth.passwordRecoveryEnabled) {
      return res.status(503).json({ success: false, message: "La recuperación de acceso no está habilitada actualmente." });
    }
    await confirmAdminPasswordRecovery(req.body?.token, req.body?.newPassword);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, message: "Contraseña actualizada. Inicia sesión de nuevo." });
  } catch (error) {
    return next(error);
  }
}
