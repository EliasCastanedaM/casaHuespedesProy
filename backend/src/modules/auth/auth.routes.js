import { Router } from "express";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import {
  loginController, logoutController, logoutAllController, currentSessionController,
  changePasswordController, requestPasswordRecoveryController, confirmPasswordRecoveryController,
} from "./auth.controller.js";

const router = Router();

router.post("/login", authLimiter, loginController);
router.get("/session", requireAdminAuth, currentSessionController);
router.post("/logout", requireAdminAuth, logoutController);
router.post("/logout-all", requireAdminAuth, logoutAllController);
router.post("/password/change", requireAdminAuth, authLimiter, changePasswordController);
router.post("/password/recovery/request", authLimiter, requestPasswordRecoveryController);
router.post("/password/recovery/confirm", authLimiter, confirmPasswordRecoveryController);

export default router;
