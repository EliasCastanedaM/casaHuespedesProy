import { Router } from "express";
import {
  getAvailabilityController,
  searchAvailabilityController,
  searchCategoryAvailabilityController,
} from "./availability.controller.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

// Compatibilidad operativa: conserva las rutas físicas, pero únicamente para
// usuarios administrativos. La web pública trabaja con /categories.
router.get("/", requireAdminAuth, getAvailabilityController);

router.post("/search", requireAdminAuth, searchAvailabilityController);

// Disponibilidad comercial agrupada por las categorías activas configuradas en la base.
router.post("/categories", searchCategoryAvailabilityController);

export default router;
