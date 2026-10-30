import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { registerAdminSession, SESSION_SECONDS } from "./auth.sessions.js";

export async function loginService(email, password) {
  const result = await pool.query(
    `
    SELECT id, name, email, password_hash, role
    FROM users
    WHERE email = $1
    LIMIT 1;
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    const error = new Error("Usuario o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  const passwordIsValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordIsValid) {
    const error = new Error("Usuario o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  if (!["admin", "staff"].includes(user.role)) {
    const error = new Error("Usuario o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  // Crear la sesión antes de emitir el token: si falla la base, no hay acceso.
  const sid = await registerAdminSession(user.id);
  const token = jwt.sign(
    { id: user.id, sid },
    env.jwtSecret,
    {
      expiresIn: SESSION_SECONDS,
      algorithm: "HS256",
      issuer: "casa-huespedes-pimentel",
      audience: "hotel-admin",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
