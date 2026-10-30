import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";
import { getPrivacyRetentionPreview } from "./privacy.service.js";

const router = Router();

// Only anonymous aggregate counts are returned, never client identifiers.
router.get("/retention-preview", requireAdminAuth, requireAdminRole, async (_req, res, next) => {
  try {
    const preview = await getPrivacyRetentionPreview();
    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, data: preview });
  } catch (error) {
    return next(error);
  }
});
export default router;
