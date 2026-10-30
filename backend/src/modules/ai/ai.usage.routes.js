import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";
import { getOpenAiUsageDashboard } from "./ai.usage.js";

const router = Router();

router.get("/", requireAdminAuth, requireAdminRole, async (req, res, next) => {
  try {
    const days = Number(req.query.days);
    const report = await getOpenAiUsageDashboard(days);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

export default router;
