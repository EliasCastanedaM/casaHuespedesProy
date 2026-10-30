import { Router } from "express";
import { uploadImage } from "../../middlewares/uploads/uploadImage.js";
import { MEDIA_LIMITS } from "../../middlewares/uploads/mediaSecurity.js";
import {
  uploadRoomImages,
  uploadRoomVideos,
} from "../../middlewares/uploads/uploadRoomMedia.js";

import {
  getPublicRoomCategoriesController,
  getPublicRoomCategoryBySlugController,
  updateRoomCategoryController,
  getAllRoomsController,
  getRoomByIdController,
  createRoomController,
  updateRoomController,
  deleteRoomController,
  uploadRoomImageController,
  uploadRoomImagesController,
  uploadRoomVideosController,
  deleteRoomImageController,
  deleteRoomVideoController,
} from "./room.controller.js";
import { requireAdminAuth, requireAdminRole } from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/", requireAdminAuth, getAllRoomsController);
router.get("/categories", getPublicRoomCategoriesController);
router.get("/categories/:slug", getPublicRoomCategoryBySlugController);
// El personal puede preparar tarifas en el panel comercial, pero solo el
// administrador puede publicar cambios directos del precio base.
router.put(
  "/categories/:slug",
  requireAdminAuth,
  requireAdminRole,
  updateRoomCategoryController
);
router.get("/admin", requireAdminAuth, getAllRoomsController);
router.get("/:id", requireAdminAuth, getRoomByIdController);

// Una sola foto que reemplaza la portada actual.
router.post(
  "/:id/image",
  requireAdminAuth,
  requireAdminRole,
  uploadImage.single("image"),
  uploadRoomImageController
);

// Varias fotos adicionales elegidas desde la PC.
router.post(
  "/:id/images",
  requireAdminAuth,
  requireAdminRole,
  uploadRoomImages.array("files", MEDIA_LIMITS.imageCount),
  uploadRoomImagesController
);

// Varios videos elegidos desde la PC.
router.post(
  "/:id/videos",
  requireAdminAuth,
  requireAdminRole,
  uploadRoomVideos.array("files", MEDIA_LIMITS.videoCount),
  uploadRoomVideosController
);

// Elimina una foto o un video específico de una habitación.
router.delete(
  "/:roomId/images/:imageId",
  requireAdminAuth,
  requireAdminRole,
  deleteRoomImageController
);
router.delete(
  "/:roomId/videos/:videoId",
  requireAdminAuth,
  requireAdminRole,
  deleteRoomVideoController
);

router.post("/", requireAdminAuth, requireAdminRole, createRoomController);
router.put("/:id", requireAdminAuth, requireAdminRole, updateRoomController);
router.delete("/:id", requireAdminAuth, requireAdminRole, deleteRoomController);

export default router;
