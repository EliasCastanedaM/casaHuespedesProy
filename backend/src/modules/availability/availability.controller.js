import {
  listRoomsForAvailabilityService,
  searchAvailableRoomsService,
} from "./availability.service.js";

export async function getAvailabilityController(req, res, next) {
  try {
    if (!req.query.check_in) {
      const rooms = await listRoomsForAvailabilityService();
      return res.json(rooms);
    }

    const result = await searchAvailableRoomsService({
      ...req.query,
      available_only: false,
    });
    return res.json(result.rooms);
  } catch (error) {
    next(error);
  }
}

export async function searchAvailabilityController(req, res, next) {
  try {
    const result = await searchAvailableRoomsService(req.body);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
