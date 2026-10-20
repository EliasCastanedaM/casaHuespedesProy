import { Router } from "express";
import { getPublicHotelProfileService } from "./hotelProfile.service.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const profile = await getPublicHotelProfileService();
    if (!profile) {
      return res.status(503).json({
        success: false,
        message: "La dirección del hospedaje no está disponible actualmente.",
      });
    }
    return res.json({ success: true, data: profile });
  } catch (error) {
    return next(error);
  }
});

export default router;
