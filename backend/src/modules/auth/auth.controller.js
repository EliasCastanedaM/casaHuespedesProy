import { loginService } from "./auth.service.js";

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

    return res.json({
      success: true,
      message: "Inicio de sesión correcto.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}