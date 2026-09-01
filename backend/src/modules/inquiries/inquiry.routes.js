import { Router } from "express";

import {
  createInquiryController,
  getAllInquiriesController,
  updateInquiryStatusController,
} from "./inquiry.controller.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

router.post("/", createInquiryController);
router.get("/", requireAdminAuth, getAllInquiriesController);
router.put(
  "/:id/status",
  requireAdminAuth,
  updateInquiryStatusController
);

export default router;
