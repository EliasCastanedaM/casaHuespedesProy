// Importamos Router de Express
import { Router } from "express";

// Importamos controladores de reservas
import {
  checkAvailabilityController,
  createBookingController,
  getBookingPaymentStatusController,
  getAllBookingsController,
  reportBookingPaymentController,
  updateBookingStatusController,
} from "./booking.controller.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

// Creamos router de reservas
const router = Router();

// Ruta para validar disponibilidad de una habitación
router.post("/check-availability", checkAvailabilityController);

// Ruta para crear una reserva
router.post("/", createBookingController);

// El huésped avisa que ya realizó el pago usando el token de su reserva.
router.post("/:id/report-payment", reportBookingPaymentController);

// Consulta pública y limitada del estado del pago.
router.get("/:id/payment-status", getBookingPaymentStatusController);

// Ruta para listar reservas.
router.get("/", requireAdminAuth, getAllBookingsController);

// Ruta para actualizar el estado de una reserva.
router.put(
  "/:id/status",
  requireAdminAuth,
  updateBookingStatusController
);

// Exportamos router
export default router;
