import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import {
  listConversationsController,
  listHandoffsController,
  listMessagesController,
  receiveWebhookController,
  sendManualMessageController,
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

router.get("/conversations", requireAdminAuth, listConversationsController);
router.get(
  "/conversations/:channel/:externalUserId/messages",
  requireAdminAuth,
  listMessagesController
);
router.post(
  "/conversations/:channel/:externalUserId/messages",
  requireAdminAuth,
  sendManualMessageController
);
router.patch(
  "/conversations/:channel/:externalUserId/handoff",
  requireAdminAuth,
  updateHandoffController
);

export default router;
