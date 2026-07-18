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

// Creamos router
const router = Router();

// Ruta pública para ver galería
router.get("/", getPublicGalleryController);

// Ruta admin para ver todo
router.get("/admin", getAllGalleryController);

// Ruta para crear elemento
router.post("/", createGalleryItemController);

// Ruta para actualizar elemento
router.put("/:id", updateGalleryItemController);

// Ruta para eliminar elemento
router.delete("/:id", deleteGalleryItemController);

// Exportamos router
export default router;