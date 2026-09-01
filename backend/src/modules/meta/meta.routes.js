import { Router } from "express";
import {
  receiveWebhookController,
  verifyWebhookController,
} from "./meta.controller.js";

const router = Router();

router.get("/webhook", verifyWebhookController);
router.post("/webhook", receiveWebhookController);

export default router;
