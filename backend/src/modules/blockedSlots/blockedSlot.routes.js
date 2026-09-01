import { Router } from "express";

import {
  createBlockedSlotController,
  deleteBlockedSlotController,
  getBlockedSlotsController,
} from "./blockedSlot.controller.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/", requireAdminAuth, getBlockedSlotsController);
router.post("/", requireAdminAuth, createBlockedSlotController);
router.delete("/:id", requireAdminAuth, deleteBlockedSlotController);

export default router;
