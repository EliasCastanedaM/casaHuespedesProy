// Importamos multer para recibir archivos desde formularios
import multer from "multer";

// Guardamos la imagen en memoria temporal.
// No se guarda en disco, solo pasa por backend y luego va a Cloudinary.
const storage = multer.memoryStorage();

// Filtro para aceptar solo imágenes
function fileFilter(req, file, cb) {
  // Validamos que el archivo sea imagen
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos de imagen"), false);
  }
}

// Configuramos multer
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    // Límite de 5MB por imagen
    fileSize: 5 * 1024 * 1024,
  },
});