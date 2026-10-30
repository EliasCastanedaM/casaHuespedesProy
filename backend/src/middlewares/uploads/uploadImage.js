import multer from "multer";
import { allowedImageMime, MEDIA_LIMITS } from "./mediaSecurity.js";

// Solo imágenes comunes. El controlador verifica además su firma binaria.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    if (!allowedImageMime(file.mimetype)) {
      const error = new Error("Formato de imagen no permitido.");
      error.statusCode = 415;
      return callback(error);
    }
    return callback(null, true);
  },
  limits: { files: 1, fileSize: MEDIA_LIMITS.singleImageBytes, fields: 10 },
});
