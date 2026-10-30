// Importamos Router de Express
import { Router } from "express";

// Importamos controladores de galería
import {
  getPublicGalleryController,
  getAllGalleryController,
  createGalleryItemController,
  updateGalleryItemController,
  deleteGalleryItemController,
} from "./gallery.controller.js";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";

// Creamos router
const router = Router();

// Ruta pública para ver galería
router.get("/", getPublicGalleryController);

// Ruta admin para ver todo
router.get("/admin", requireAdminAuth, getAllGalleryController);

// Ruta para crear elemento
router.post("/", requireAdminAuth, requireAdminRole, createGalleryItemController);

// Ruta para actualizar elemento
router.put("/:id", requireAdminAuth, requireAdminRole, updateGalleryItemController);

// Ruta para eliminar elemento
router.delete("/:id", requireAdminAuth, requireAdminRole, deleteGalleryItemController);

// Exportamos router
export default router;
