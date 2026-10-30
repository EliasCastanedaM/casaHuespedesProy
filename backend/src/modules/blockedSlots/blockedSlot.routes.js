import { Router } from "express";

import {
  createBlockedSlotController,
  deleteBlockedSlotController,
  getBlockedSlotsController,
} from "./blockedSlot.controller.js";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/", requireAdminAuth, getBlockedSlotsController);
router.post("/", requireAdminAuth, requireAdminRole, createBlockedSlotController);
router.delete("/:id", requireAdminAuth, requireAdminRole, deleteBlockedSlotController);

export default router;
