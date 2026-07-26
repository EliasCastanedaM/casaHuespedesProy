import dotenv from "dotenv";

dotenv.config();

function cleanEnvEmail(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export const env = {
  port: process.env.PORT || 4000,

  nodeEnv: process.env.NODE_ENV || "development",

  databaseUrl: process.env.DATABASE_URL,

  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwtSecret:
    process.env.JWT_SECRET || "casa_huespedes_secret_temporal",

  frontendUrl:
    process.env.FRONTEND_URL || "http://localhost:5173",

  culqiPaymentUrl:
    process.env.CULQI_PAYMENT_URL ||
    "https://express.culqi.com/pago/A863017EB2",

  hotelNotificationEmail: cleanEnvEmail(
    process.env.HOTEL_NOTIFICATION_EMAIL
  ),

  brevo: {
    apiKey: process.env.BREVO_API_KEY,

    senderName:
      process.env.EMAIL_FROM_NAME ||
      "Casa Huéspedes Pimentel",

    senderEmail: cleanEnvEmail(
      process.env.EMAIL_FROM_EMAIL
    ),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};