// Importamos Router de Express
import { Router } from "express";

// Importamos controladores de reservas
import {
  checkAvailabilityController,
  createBookingController,
  deleteBookingController,
  getBookingPaymentStatusController,
  getAllBookingsController,
  getInternalCalendarController,
  reportBookingPaymentController,
  updateBookingStatusController,
} from "./booking.controller.js";

import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";

// Creamos router de reservas
const router = Router();

// Ruta pública para validar disponibilidad de una categoría
router.post("/check-availability", checkAvailabilityController);

// Ruta para crear una reserva
router.post("/", createBookingController);

// El huésped avisa que ya realizó el pago
router.post(
  "/:id/report-payment",
  reportBookingPaymentController
);

// Consulta pública del estado del pago
router.get(
  "/:id/payment-status",
  getBookingPaymentStatusController
);

// Calendario interno de solo lectura. Nunca consulta canales externos.
router.get("/calendar", requireAdminAuth, getInternalCalendarController);

// Ruta protegida para listar reservas
router.get(
  "/",
  requireAdminAuth,
  getAllBookingsController
);

// Ruta protegida para actualizar el estado
router.put(
  "/:id/status",
  requireAdminAuth,
  requireAdminRole,
  updateBookingStatusController
);

// Ruta protegida para eliminar definitivamente una reserva
router.delete(
  "/:id",
  requireAdminAuth,
  requireAdminRole,
  deleteBookingController
);

// Exportamos router
export default router;