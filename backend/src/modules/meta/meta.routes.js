import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import {
  listHandoffsController,
  receiveWebhookController,
  updateHandoffController,
  verifyWebhookController,
} from "./meta.controller.js";

const router = Router();

router.get("/webhook", verifyWebhookController);
router.post("/webhook", receiveWebhookController);
router.get("/handoffs", requireAdminAuth, listHandoffsController);
router.patch(
  "/handoffs/:channel/:externalUserId",
  requireAdminAuth,
  updateHandoffController
);

export default router;
