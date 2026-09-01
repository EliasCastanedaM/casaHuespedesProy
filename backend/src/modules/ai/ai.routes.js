import { Router } from "express";
import { chatController, requireAiAccess } from "./ai.controller.js";

const router = Router();

router.post("/chat", requireAiAccess, chatController);

export default router;
