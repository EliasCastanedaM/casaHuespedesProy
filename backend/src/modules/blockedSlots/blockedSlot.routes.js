import { Router } from "express";

import {
  createBlockedSlotController,
  deleteBlockedSlotController,
  getBlockedSlotsController,
} from "./blockedSlot.controller.js";

const router = Router();

router.get("/", getBlockedSlotsController);
router.post("/", createBlockedSlotController);
router.delete("/:id", deleteBlockedSlotController);

export default router;