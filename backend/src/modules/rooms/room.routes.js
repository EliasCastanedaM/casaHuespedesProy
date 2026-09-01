import { Router } from "express";
import { uploadImage } from "../../middlewares/uploads/uploadImage.js";
import {
  uploadRoomImages,
  uploadRoomVideos,
} from "../../middlewares/uploads/uploadRoomMedia.js";

import {
  getPublicRoomsController,
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
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/", getPublicRoomsController);
router.get("/admin", requireAdminAuth, getAllRoomsController);
router.get("/:id", getRoomByIdController);

// Una sola foto que reemplaza la portada actual.
router.post(
  "/:id/image",
  requireAdminAuth,
  uploadImage.single("image"),
  uploadRoomImageController
);

// Varias fotos adicionales elegidas desde la PC.
router.post(
  "/:id/images",
  requireAdminAuth,
  uploadRoomImages.array("files", 30),
  uploadRoomImagesController
);

// Varios videos elegidos desde la PC.
router.post(
  "/:id/videos",
  requireAdminAuth,
  uploadRoomVideos.array("files", 10),
  uploadRoomVideosController
);

// Elimina una foto o un video específico de una habitación.
router.delete(
  "/:roomId/images/:imageId",
  requireAdminAuth,
  deleteRoomImageController
);
router.delete(
  "/:roomId/videos/:videoId",
  requireAdminAuth,
  deleteRoomVideoController
);

router.post("/", requireAdminAuth, createRoomController);
router.put("/:id", requireAdminAuth, updateRoomController);
router.delete("/:id", requireAdminAuth, deleteRoomController);

export default router;
