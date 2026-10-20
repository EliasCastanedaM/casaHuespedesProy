import { Router } from "express";
import { getPublicHotelServicesService } from "./service.service.js";

const router = Router();

// Solo lectura y sin PII; las operaciones administrativas deben autenticar.
router.get("/", async (_req, res, next) => {
  try {
    const data = await getPublicHotelServicesService();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

export default router;
