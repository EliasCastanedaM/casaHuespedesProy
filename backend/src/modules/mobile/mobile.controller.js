import {
  createMobileBookingService,
  getMobileBookingsService,
  getMobileDashboardService,
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
      message: "Habitación reservada correctamente.",
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
