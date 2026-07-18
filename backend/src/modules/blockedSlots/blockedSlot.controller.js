import {
  createBlockedSlotService,
  deleteBlockedSlotService,
  getBlockedSlotsService,
} from "./blockedSlot.service.js";

export async function getBlockedSlotsController(req, res, next) {
  try {
    const blockedSlots = await getBlockedSlotsService();

    return res.json({
      success: true,
      data: blockedSlots,
    });
  } catch (error) {
    next(error);
  }
}

export async function createBlockedSlotController(req, res, next) {
  try {
    const { room_id, blocked_date, blocked_time, block_type } = req.body;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: "La habitación es obligatoria.",
      });
    }

    if (!blocked_date) {
      return res.status(400).json({
        success: false,
        message: "La fecha de bloqueo es obligatoria.",
      });
    }

    if (block_type !== "day" && !blocked_time) {
      return res.status(400).json({
        success: false,
        message: "La hora es obligatoria para bloqueos por horario.",
      });
    }

    const blockedSlot = await createBlockedSlotService({
      room_id,
      blocked_date,
      blocked_time,
      block_type,
      reason: req.body.reason,
    });

    return res.status(201).json({
      success: true,
      message: "Bloqueo creado correctamente.",
      data: blockedSlot,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBlockedSlotController(req, res, next) {
  try {
    const { id } = req.params;

    const deleted = await deleteBlockedSlotService(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Bloqueo no encontrado.",
      });
    }

    return res.json({
      success: true,
      message: "Bloqueo eliminado correctamente.",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
}