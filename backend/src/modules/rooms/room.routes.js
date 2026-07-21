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

const router = Router();

router.get("/", getPublicRoomsController);
router.get("/admin", getAllRoomsController);
router.get("/:id", getRoomByIdController);

// Una sola foto que reemplaza la portada actual.
router.post(
  "/:id/image",
  uploadImage.single("image"),
  uploadRoomImageController
);

// Varias fotos adicionales elegidas desde la PC.
router.post(
  "/:id/images",
  uploadRoomImages.array("files", 30),
  uploadRoomImagesController
);

// Varios videos elegidos desde la PC.
router.post(
  "/:id/videos",
  uploadRoomVideos.array("files", 10),
  uploadRoomVideosController
);

// Elimina una foto o un video específico de una habitación.
router.delete("/:roomId/images/:imageId", deleteRoomImageController);
router.delete("/:roomId/videos/:videoId", deleteRoomVideoController);

router.post("/", createRoomController);
router.put("/:id", updateRoomController);
router.delete("/:id", deleteRoomController);

export default router;
