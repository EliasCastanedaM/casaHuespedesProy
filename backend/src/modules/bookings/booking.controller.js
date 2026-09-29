import {
  checkAvailabilityService,
  createBookingByCategoryService,
  deleteBookingService,
  getBookingPaymentStatusService,
  getAllBookingsService,
  reportBookingPaymentService,
  updateBookingStatusService,
} from "./booking.service.js";
import { searchAvailableRoomCategoriesService } from "../rooms/roomCategory.service.js";

// Verifica disponibilidad comercial por categoría.
// El huésped nunca selecciona ni conoce el room_id físico.
export async function checkAvailabilityController(req, res, next) {
  try {
    const {
      category_slug,
      check_in,
      check_out,
      nights,
      check_in_time,
      guests_count,
    } = req.body;

    const normalizedCategorySlug = String(category_slug || "")
      .trim()
      .toLowerCase();

    if (!normalizedCategorySlug || !check_in || (!check_out && !nights)) {
      return res.status(400).json({
        success: false,
        message:
          "Categoría, fecha de ingreso y fecha de salida o noches son obligatorias.",
      });
    }

    const result = await searchAvailableRoomCategoriesService({
      check_in,
      check_out,
      nights,
      check_in_time,
      guests_count: guests_count || 1,
    });

    const category = (result.categories || []).find(
      (item) => String(item.slug || "").toLowerCase() === normalizedCategorySlug
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "La categoría seleccionada no existe o no admite esa cantidad de huéspedes.",
      });
    }

    return res.json({
      success: true,
      data: {
        category_slug: category.slug,
        category_name: category.name,
        check_in: result.check_in,
        check_out: result.check_out,
        nights: result.nights,
        guests_count: result.guests_count,
        total_quantity: Number(category.active_quantity || category.total_quantity || 0),
        available_quantity: Number(category.available_quantity || 0),
        occupied_quantity: Number(category.occupied_quantity || 0),
        available: Number(category.available_quantity || 0) > 0,
        price_per_night: category.price_per_night,
      },
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
      category_slug,
      check_in,
      check_out,
      nights,
      guests_count,
      customer,
    } = req.body;

    const finalFullName = customer?.full_name || full_name;
    const finalPhone = customer?.phone || phone;
    const finalEmail = customer?.email || req.body.email;

    if (!finalFullName || !finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Nombre completo y celular son obligatorios.",
      });
    }

    if (!finalEmail) {
      return res.status(400).json({
        success: false,
        message:
          "El correo es obligatorio para enviarte el estado de la reserva.",
      });
    }

    if (!category_slug) {
      return res.status(400).json({
        success: false,
        message: "La categoría de habitación es obligatoria.",
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

    // El huésped siempre reserva una categoría. La habitación física se
    // asigna internamente dentro del servicio de reservas.
    const result = await createBookingByCategoryService({
      ...req.body,
      room_id: undefined,
    });

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

// El huésped avisa que terminó el pago
export async function reportBookingPaymentController(req, res, next) {
  try {
    const { id } = req.params;
    const { public_token: publicToken } = req.body;

    if (!publicToken) {
      return res.status(400).json({
        success: false,
        message: "No se pudo validar la reserva.",
      });
    }

    const result = await reportBookingPaymentService(id, publicToken);

    return res.json({
      success: true,
      message:
        "Avisamos al hospedaje. Tu reserva se confirmará después de verificar el pago en Culqi.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Consulta pública del estado del pago
export async function getBookingPaymentStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const publicToken = req.query.token;

    if (!publicToken) {
      return res.status(400).json({
        success: false,
        message: "No se pudo validar la reserva.",
      });
    }

    const result = await getBookingPaymentStatusService(id, publicToken);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Reserva no encontrada.",
      });
    }

    return res.json({
      success: true,
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

// Elimina definitivamente una reserva
export async function deleteBookingController(req, res, next) {
  try {
    const { id } = req.params;

    const booking = await deleteBookingService(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Reserva no encontrada.",
      });
    }

    return res.json({
      success: true,
      message: "Reserva eliminada correctamente.",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}