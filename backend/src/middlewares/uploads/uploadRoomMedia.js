import multer from "multer";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { allowedImageMime, allowedVideoMime, MEDIA_LIMITS } from "./mediaSecurity.js";

function rejectType(message) {
  const error = new Error(message);
  error.statusCode = 415;
  return error;
}

export const uploadRoomImages = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    return allowedImageMime(file.mimetype)
      ? callback(null, true)
      : callback(rejectType("Solo se permiten imágenes JPEG, PNG, WebP y GIF."));
  },
  limits: { files: MEDIA_LIMITS.imageCount, fileSize: MEDIA_LIMITS.imageBytes, fields: 10 },
});

// Los vídeos pasan por archivos temporales con nombres aleatorios, no RAM.
export const uploadRoomVideos = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename(_req, _file, callback) {
      callback(null, "chp-upload-" + randomUUID());
    },
  }),
  fileFilter(_req, file, callback) {
    return allowedVideoMime(file.mimetype)
      ? callback(null, true)
      : callback(rejectType("Solo se permiten vídeos MP4, MOV y WebM."));
  },
  limits: { files: MEDIA_LIMITS.videoCount, fileSize: MEDIA_LIMITS.videoBytes, fields: 10 },
});
