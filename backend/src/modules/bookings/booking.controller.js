import {
  checkAvailabilityService,
  createBookingService,
  getAllBookingsService,
  updateBookingStatusService,
} from "./booking.service.js";

// Verifica disponibilidad de habitación
export async function checkAvailabilityController(req, res, next) {
  try {
    const { room_id, check_in, check_out, nights, check_in_time } = req.body;

    if (!room_id || !check_in || (!check_out && !nights)) {
      return res.status(400).json({
        success: false,
        message: "Habitación, fecha de ingreso y noches son obligatorias.",
      });
    }

    const result = await checkAvailabilityService({
      room_id,
      check_in,
      check_out,
      nights,
      check_in_time,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Crea reserva desde el formulario web
export async function createBookingController(req, res, next) {
  try {
    const {
      full_name,
      phone,
      room_id,
      check_in,
      check_out,
      nights,
      guests_count,
      customer,
    } = req.body;

    // Soporta estructura nueva del Home.jsx y estructura antigua con customer
    const finalFullName = customer?.full_name || full_name;
    const finalPhone = customer?.phone || phone;

    if (!finalFullName || !finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Nombre completo y celular son obligatorios.",
      });
    }

    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: "La habitación es obligatoria.",
      });
    }

    if (!check_in) {
      return res.status(400).json({
        success: false,
        message: "La fecha de ingreso es obligatoria.",
      });
    }

    if (!check_out && !nights) {
      return res.status(400).json({
        success: false,
        message: "Debes enviar noches o fecha de salida.",
      });
    }

    if (!guests_count) {
      return res.status(400).json({
        success: false,
        message: "La cantidad de huéspedes es obligatoria.",
      });
    }

 const result = await createBookingService(req.body);

if (result.mode === "inquiry") {
  return res.status(201).json({
    success: true,
    message: result.message,
    data: result,
  });
}

return res.status(201).json({
  success: true,
  message: "Solicitud de reserva registrada correctamente.",
  data: result,
});
  } catch (error) {
    next(error);
  }
}

// Lista reservas para admin
export async function getAllBookingsController(req, res, next) {
  try {
    const bookings = await getAllBookingsService();

    return res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
}

// Actualiza estado de reserva
export async function updateBookingStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "El estado es obligatorio.",
      });
    }

    const booking = await updateBookingStatusService(id, status);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Reserva no encontrada.",
      });
    }

    return res.json({
      success: true,
      message: "Estado actualizado correctamente.",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}