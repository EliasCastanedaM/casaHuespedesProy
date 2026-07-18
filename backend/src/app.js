import availabilityRoutes from "./routes/availability.routes.js";
import settingRoutes from "./modules/settings/setting.routes.js";
import blockedSlotRoutes from "./modules/blockedSlots/blockedSlot.routes.js";
// Importamos rutas de galería
import galleryRoutes from "./modules/gallery/gallery.routes.js";
// Importamos rutas de clientes
import customerRoutes from "./modules/customers/customer.routes.js";
// Importamos las rutas del módulo reservas
import bookingRoutes from "./modules/bookings/booking.routes.js";
// Importamos Express para crear la aplicación backend
import express from "express";
import inquiryRoutes from "./modules/inquiries/inquiry.routes.js";
// Importamos CORS para permitir que el frontend se conecte con el backend
import cors from "cors";

// Importamos variables de entorno
import { env } from "./config/env.js";

// Importamos el middleware global de errores
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

import authRoutes from "./modules/auth/auth.routes.js";

// Importamos las rutas del módulo habitaciones
import roomRoutes from "./modules/rooms/room.routes.js";

// Creamos la aplicación principal de Express
const app = express();

// Configuramos CORS.
// Esto permite que React, corriendo en localhost:5173, consuma la API.
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

// Permite recibir datos en formato JSON desde el frontend
app.use(express.json());

// Permite recibir datos enviados desde formularios HTML
app.use(express.urlencoded({ extended: true }));

// Ruta principal de prueba.
// Sirve para comprobar que la API está funcionando.
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Casa Huéspedes Pimentel funcionando",
  });
});

// Ruta de salud del servidor.
// Sirve para validar rápidamente que el backend responde.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    service: "Casa Huéspedes Pimentel API",
  });
});

// Rutas del módulo habitaciones.
// Todas las rutas de room.routes.js empezarán con /api/rooms
app.use("/api/rooms", roomRoutes);
// Rutas del módulo reservas.
// Todas empiezan con /api/bookings
app.use("/api/bookings", bookingRoutes);
// Rutas del módulo clientes.
// Todas empiezan con /api/customers
app.use("/api/customers", customerRoutes);

// Middleware global de errores.
// Debe ir después de las rutas.
app.use(errorMiddleware);

// Rutas del módulo galería.
// Todas empiezan con /api/gallery
app.use("/api/gallery", galleryRoutes);

app.use("/api/inquiries", inquiryRoutes);

app.use("/api/settings", settingRoutes);
app.use("/api/blocked-slots", blockedSlotRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/availability", availabilityRoutes);
// Exportamos app para usarla en server.js
export default app;