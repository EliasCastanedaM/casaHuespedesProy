import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";
import {
  listConversationsController,
  dashboardController,
  updateResolvedController,
  listHandoffsController,
  listMessagesController,
  receiveWebhookController,
  sendManualMessageController,
  confirmWhatsAppMvpReservationController,
  updateHandoffController,
  verifyWebhookController,
} from "./meta.controller.js";
import {
  completeEmbeddedSignupController,
  embeddedSignupStatusController,
} from "./embedded-signup.controller.js";

const router = Router();

router.get("/webhook", verifyWebhookController);
router.post("/webhook", receiveWebhookController);

router.get(
  "/embedded-signup/status",
  requireAdminAuth,
  requireAdminRole,
  embeddedSignupStatusController
);
router.post(
  "/embedded-signup/complete",
  requireAdminAuth,
  requireAdminRole,
  completeEmbeddedSignupController
);

router.get("/handoffs", requireAdminAuth, listHandoffsController);
router.patch(
  "/handoffs/:channel/:externalUserId",
  requireAdminAuth,
  updateHandoffController
);

router.get("/conversations/dashboard", requireAdminAuth, dashboardController);
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
router.post(
  "/conversations/:channel/:externalUserId/confirm-reservation",
  requireAdminAuth,
  requireAdminRole,
  confirmWhatsAppMvpReservationController
);
router.patch(
  "/conversations/:channel/:externalUserId/resolved",
  requireAdminAuth,
  updateResolvedController
);
router.patch(
  "/conversations/:channel/:externalUserId/handoff",
  requireAdminAuth,
  updateHandoffController
);

export default router;
