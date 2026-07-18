// Importamos Router de Express
import { Router } from "express";

// Importamos controladores de reservas
import {
  checkAvailabilityController,
  createBookingController,
  getAllBookingsController,
  updateBookingStatusController,
} from "./booking.controller.js";

// Creamos router de reservas
const router = Router();

// Ruta para validar disponibilidad de una habitación
router.post("/check-availability", checkAvailabilityController);

// Ruta para crear una reserva
router.post("/", createBookingController);

// Ruta para listar reservas.
// Más adelante será protegida para admin.
router.get("/", getAllBookingsController);

// Ruta para actualizar el estado de una reserva.
// Más adelante será protegida para admin.
router.put("/:id/status", updateBookingStatusController);

// Exportamos router
export default router;