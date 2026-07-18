// Importamos la librería pg para conectarnos a PostgreSQL
import pg from "pg";

// Importamos nuestras variables de entorno centralizadas
import { env } from "./env.js";

// Pool permite manejar conexiones reutilizables a PostgreSQL
const { Pool } = pg;

// Detectamos si estamos usando una URL completa de conexión.
// Esto es lo más común cuando desplegamos en Render con Supabase.
const hasDatabaseUrl = Boolean(env.databaseUrl);

const poolConfig = hasDatabaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host: env.db.host,
      port: env.db.port,
      database: env.db.name,
      user: env.db.user,
      password: env.db.password,
      ssl:
        env.nodeEnv === "production"
          ? {
              rejectUnauthorized: false,
            }
          : false,
    };

// Creamos el pool de conexión con PostgreSQL
export const pool = new Pool(poolConfig);

// Esta función prueba si la conexión a la base de datos funciona.
export async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("Base de datos conectada:", result.rows[0].now);

    return true;
  } catch (error) {
    console.error("Error conectando a la base de datos:");
    console.error("Mensaje:", error.message);
    console.error("Código:", error.code);
    console.error("Detalle:", error.detail);

    return false;
  }
}