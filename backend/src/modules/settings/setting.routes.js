import { Router } from "express";

import {
  getAvailabilitySettingsController,
  updateAvailabilitySettingsController,
} from "./setting.controller.js";

const router = Router();

router.get("/availability", getAvailabilitySettingsController);
router.put("/availability", updateAvailabilitySettingsController);

export default router;