import { Router } from "express";

import {
  createInquiryController,
  getAllInquiriesController,
  updateInquiryStatusController,
} from "./inquiry.controller.js";

const router = Router();

router.post("/", createInquiryController);
router.get("/", getAllInquiriesController);
router.put("/:id/status", updateInquiryStatusController);

export default router;