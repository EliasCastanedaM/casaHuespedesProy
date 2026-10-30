import { Router } from "express";

import {
  getAvailabilitySettingsController,
  updateAvailabilitySettingsController,
} from "./setting.controller.js";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/availability", getAvailabilitySettingsController);
router.put(
  "/availability",
  requireAdminAuth,
  requireAdminRole,
  updateAvailabilitySettingsController
);

export default router;
