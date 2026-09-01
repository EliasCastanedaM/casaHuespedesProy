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
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

// Creamos router
const router = Router();

// Ruta pública para ver galería
router.get("/", getPublicGalleryController);

// Ruta admin para ver todo
router.get("/admin", requireAdminAuth, getAllGalleryController);

// Ruta para crear elemento
router.post("/", requireAdminAuth, createGalleryItemController);

// Ruta para actualizar elemento
router.put("/:id", requireAdminAuth, updateGalleryItemController);

// Ruta para eliminar elemento
router.delete("/:id", requireAdminAuth, deleteGalleryItemController);

// Exportamos router
export default router;
