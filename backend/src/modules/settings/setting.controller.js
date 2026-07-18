import {
  getAvailabilitySettingsService,
  updateAvailabilitySettingsService,
} from "./setting.service.js";

export async function getAvailabilitySettingsController(req, res, next) {
  try {
    const settings = await getAvailabilitySettingsService();

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAvailabilitySettingsController(req, res, next) {
  try {
    const {
      start_time,
      end_time,
      slot_minutes,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      is_active,
    } = req.body;

    if (!start_time || !end_time || !slot_minutes) {
      return res.status(400).json({
        success: false,
        message: "Hora inicio, hora fin y duración son obligatorias.",
      });
    }

    const settings = await updateAvailabilitySettingsService({
      start_time,
      end_time,
      slot_minutes,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      is_active,
    });

    return res.json({
      success: true,
      message: "Configuración actualizada correctamente.",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}