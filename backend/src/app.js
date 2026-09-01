import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { notFoundMiddleware } from "./middlewares/notFoundMiddleware.js";
import {
  aiLimiter,
  apiLimiter,
  authLimiter,
} from "./middlewares/rateLimiters.js";

import authRoutes from "./modules/auth/auth.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import blockedSlotRoutes from "./modules/blockedSlots/blockedSlot.routes.js";
import bookingRoutes from "./modules/bookings/booking.routes.js";
import customerRoutes from "./modules/customers/customer.routes.js";
import galleryRoutes from "./modules/gallery/gallery.routes.js";
import inquiryRoutes from "./modules/inquiries/inquiry.routes.js";
import metaRoutes from "./modules/meta/meta.routes.js";
import roomRoutes from "./modules/rooms/room.routes.js";
import settingRoutes from "./modules/settings/setting.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";

const app = express();

// Render funciona detrás de un proxy. Así el límite usa la IP real del cliente.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin(origin, callback) {
      // Las llamadas servidor-a-servidor no envían la cabecera Origin.
      if (!origin || env.frontendUrls.includes(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error("Origen no permitido por CORS.");
      error.statusCode = 403;
      callback(error);
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
    verify(req, _res, buffer) {
      // Meta firma exactamente estos bytes; se conservan para validar el webhook.
      req.rawBody = Buffer.from(buffer);
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "API Casa Huéspedes Pimentel funcionando",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "OK",
    service: "Casa Huéspedes Pimentel API",
    aiConfigured: Boolean(env.openai.apiKey),
  });
});

// Meta puede entregar ráfagas y reintentos; no usa el limitador genérico.
app.use("/api/meta", metaRoutes);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/rooms", apiLimiter, roomRoutes);
app.use("/api/bookings", apiLimiter, bookingRoutes);
app.use("/api/customers", apiLimiter, customerRoutes);
app.use("/api/gallery", apiLimiter, galleryRoutes);
app.use("/api/inquiries", apiLimiter, inquiryRoutes);
app.use("/api/settings", apiLimiter, settingRoutes);
app.use("/api/blocked-slots", apiLimiter, blockedSlotRoutes);
app.use("/api/availability", apiLimiter, availabilityRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
