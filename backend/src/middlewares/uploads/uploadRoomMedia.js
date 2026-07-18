import multer from "multer";

const storage = multer.memoryStorage();

function imageFileFilter(req, file, callback) {
  if (file.mimetype?.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new Error(`El archivo ${file.originalname} no es una imagen válida.`));
}

function videoFileFilter(req, file, callback) {
  if (file.mimetype?.startsWith("video/")) {
    callback(null, true);
    return;
  }

  callback(new Error(`El archivo ${file.originalname} no es un video válido.`));
}

// Hasta 30 fotos por selección, con máximo 10 MB por foto.
export const uploadRoomImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    files: 30,
    fileSize: 10 * 1024 * 1024,
  },
});

// Hasta 10 videos por selección, con máximo 100 MB por video.
export const uploadRoomVideos = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    files: 10,
    fileSize: 100 * 1024 * 1024,
  },
});
