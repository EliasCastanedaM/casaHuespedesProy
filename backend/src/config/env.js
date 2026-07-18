// Importamos dotenv para leer variables del archivo .env
import dotenv from "dotenv";

// Activamos dotenv
dotenv.config();

// Exportamos todas las variables de entorno en un solo objeto
export const env = {
  // Render asigna automáticamente process.env.PORT.
  // En local, si no existe PORT, usará 4000.
  port: process.env.PORT || 4000,

  nodeEnv: process.env.NODE_ENV || "development",

  // URL completa de conexión a PostgreSQL/Supabase.
  // Es la forma más cómoda para Render.
  databaseUrl: process.env.DATABASE_URL,

  // Configuración separada de base de datos.
  // Sirve para trabajar localmente si no usas DATABASE_URL.
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwtSecret: process.env.JWT_SECRET,

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};