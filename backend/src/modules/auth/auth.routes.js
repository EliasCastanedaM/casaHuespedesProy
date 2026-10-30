import { Router } from "express";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import {
  loginController, logoutController, logoutAllController, currentSessionController,
} from "./auth.controller.js";

const router = Router();

router.post("/login", authLimiter, loginController);
router.get("/session", requireAdminAuth, currentSessionController);
router.post("/logout", requireAdminAuth, logoutController);
router.post("/logout-all", requireAdminAuth, logoutAllController);

export default router;
