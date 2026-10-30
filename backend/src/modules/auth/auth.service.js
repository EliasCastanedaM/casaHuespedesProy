import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { registerAdminSession, SESSION_SECONDS } from "./auth.sessions.js";

// Match the cost of a bcrypt check for unknown accounts to reduce enumeration timing.
const DUMMY_HASH = bcrypt.hashSync("nonexistent-account", 12);

export async function loginService(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const result = await pool.query(
    `
    SELECT id, name, email, password_hash, role
    FROM users
    WHERE lower(email) = $1
    LIMIT 1;
    `,
    [normalizedEmail]
  );

  const user = result.rows[0];
  const passwordIsValid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

  if (!user || !passwordIsValid) {
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
