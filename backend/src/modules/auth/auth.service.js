import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "casa_huespedes_secret_temporal";

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

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "8h",
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