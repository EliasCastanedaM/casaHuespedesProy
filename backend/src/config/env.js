import dotenv from "dotenv";

dotenv.config();

function cleanEnvEmail(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function cleanEnvValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function csvEnv(value, fallback = []) {
  const items = cleanEnvValue(value)
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

function boundedNumber(value, fallback, { min, max }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
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

  jwtSecret: cleanEnvValue(process.env.JWT_SECRET),

  frontendUrl: cleanEnvValue(
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/+$/, ""),

  frontendUrls: csvEnv(process.env.FRONTEND_URLS, [
    process.env.FRONTEND_URL || "http://localhost:5173",
  ]),

  openai: {
    apiKey: cleanEnvValue(process.env.OPENAI_API_KEY),
    model: cleanEnvValue(process.env.OPENAI_MODEL) || "gpt-5.6-luna",
  },

  ai: {
    internalToken: cleanEnvValue(process.env.AI_INTERNAL_TOKEN),
    maxOutputTokens: boundedNumber(
      process.env.AI_MAX_OUTPUT_TOKENS,
      500,
      { min: 100, max: 2_000 }
    ),
  },

  hotel: {
    name: cleanEnvValue(process.env.HOTEL_NAME) || "Casa Huéspedes Pimentel",
    phone: cleanEnvValue(process.env.HOTEL_PHONE),
    website: cleanEnvValue(process.env.HOTEL_WEBSITE),
  },

  meta: {
    verifyToken: cleanEnvValue(process.env.META_VERIFY_TOKEN),
    appSecret: cleanEnvValue(process.env.META_APP_SECRET),
    graphApiVersion:
      cleanEnvValue(process.env.META_GRAPH_API_VERSION) || "v26.0",
    whatsappAccessToken: cleanEnvValue(
      process.env.WHATSAPP_ACCESS_TOKEN
    ),
    whatsappPhoneNumberId: cleanEnvValue(
      process.env.WHATSAPP_PHONE_NUMBER_ID
    ),
    facebookPageAccessToken: cleanEnvValue(
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
        process.env.META_PAGE_ACCESS_TOKEN
    ),
    facebookPageId: cleanEnvValue(
      process.env.FACEBOOK_PAGE_ID || process.env.META_PAGE_ID
    ),
    instagramAccessToken: cleanEnvValue(
      process.env.INSTAGRAM_ACCESS_TOKEN
    ),
    instagramAccountId: cleanEnvValue(
      process.env.INSTAGRAM_ACCOUNT_ID ||
        process.env.META_INSTAGRAM_ACCOUNT_ID
    ),
  },

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
