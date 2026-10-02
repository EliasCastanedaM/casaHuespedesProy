import {
  createMobileBookingService,
  cancelMobileBookingService,
  getMobileBookingsService,
  getMobileDashboardService,
  getMobileCategoriesService,
  getMobileRoomsService,
} from "./mobile.service.js";

export async function getMobileDashboardController(req, res, next) {
  try {
    const data = await getMobileDashboardService();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}


export async function getMobileCategoriesController(req, res, next) {
  try {
    const { check_in, check_out, nights, guests_count } = req.query;

    if (!check_in || (!check_out && !nights)) {
      return res.status(400).json({
        success: false,
        message: "Indica fecha de ingreso y fecha de salida o noches.",
      });
    }

    const data = await getMobileCategoriesService({
      check_in,
      check_out,
      nights,
      guests_count: guests_count || 1,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function getMobileRoomsController(req, res, next) {
  try {
    const { check_in, check_out, nights, guests_count } = req.query;

    if (!check_in || (!check_out && !nights)) {
      return res.status(400).json({
        success: false,
        message: "Indica fecha de ingreso y fecha de salida o noches.",
      });
    }

    const data = await getMobileRoomsService({
      check_in,
      check_out,
      nights,
      guests_count: guests_count || 1,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function createMobileBookingController(req, res, next) {
  try {
    const booking = await createMobileBookingService(req.body);

    return res.status(201).json({
      success: true,
      message: "Categoría reservada correctamente.",
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMobileBookingsController(req, res, next) {
  try {
    const data = await getMobileBookingsService({
      limit: req.query.limit,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}


export async function cancelMobileBookingController(req, res, next) {
  try {
    const data = await cancelMobileBookingService({
      booking_id: req.params.id,
      booking_code: req.body?.booking_code,
    });

    return res.json({
      success: true,
      message: "Reserva eliminada de la operación activa.",
      data,
    });
  } catch (error) {
    return next(error);
  }
}
