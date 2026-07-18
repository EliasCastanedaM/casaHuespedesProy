import cloudinary from "../../config/cloudinary.js";

import {
  getPublicRoomsService,
  getAllRoomsService,
  getRoomByIdService,
  createRoomService,
  updateRoomService,
  deleteRoomService,
  addRoomImageService,
  addRoomImagesService,
  addRoomVideosService,
} from "./room.service.js";

function uploadBufferToCloudinary(file, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

async function removeUploadedFiles(files, resourceType) {
  await Promise.allSettled(
    files.map((file) =>
      cloudinary.uploader.destroy(file.publicId, {
        resource_type: resourceType,
      })
    )
  );
}

export async function getPublicRoomsController(req, res, next) {
  try {
    const rooms = await getPublicRoomsService();
    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
}

export async function getAllRoomsController(req, res, next) {
  try {
    const rooms = await getAllRoomsService();
    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
}

export async function getRoomByIdController(req, res, next) {
  try {
    const room = await getRoomByIdService(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    return res.json({ success: true, data: room });
  } catch (error) {
    return next(error);
  }
}

export async function createRoomController(req, res, next) {
  try {
    const roomData = req.body;

    if (!roomData.name || roomData.price_per_night === undefined) {
      return res.status(400).json({
        success: false,
        message: "El nombre y el precio por noche son obligatorios",
      });
    }

    const room = await createRoomService(roomData);

    return res.status(201).json({
      success: true,
      message: "Habitación creada correctamente",
      data: room,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateRoomController(req, res, next) {
  try {
    const room = await updateRoomService(req.params.id, req.body);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    return res.json({
      success: true,
      message: "Habitación actualizada correctamente",
      data: room,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteRoomController(req, res, next) {
  try {
    const deletedRoom = await deleteRoomService(req.params.id);

    if (!deletedRoom) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    return res.json({
      success: true,
      message: "Habitación eliminada correctamente",
      data: deletedRoom,
    });
  } catch (error) {
    return next(error);
  }
}

// Conserva el botón existente para cambiar la portada con una sola foto.
export async function uploadRoomImageController(req, res, next) {
  let uploadedImage = null;

  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar una imagen",
      });
    }

    const room = await getRoomByIdService(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    const result = await uploadBufferToCloudinary(req.file, {
      folder: `casa-huespedes-pimentel/rooms/${id}/images`,
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    uploadedImage = {
      publicId: result.public_id,
      url: result.secure_url,
    };

    const savedImage = await addRoomImageService(
      id,
      result.secure_url,
      result.public_id,
      true
    );

    return res.status(201).json({
      success: true,
      message: "Portada actualizada correctamente",
      data: {
        image: savedImage,
        image_url: result.secure_url,
      },
    });
  } catch (error) {
    if (uploadedImage) {
      await removeUploadedFiles([uploadedImage], "image");
    }

    return next(error);
  }
}

// Recibe varias fotos elegidas desde la PC.
export async function uploadRoomImagesController(req, res, next) {
  const uploadedImages = [];

  try {
    const { id } = req.params;
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar una o más fotos",
      });
    }

    const room = await getRoomByIdService(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    for (const file of files) {
      const result = await uploadBufferToCloudinary(file, {
        folder: `casa-huespedes-pimentel/rooms/${id}/images`,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
        title: file.originalname.replace(/\.[^.]+$/, ""),
        altText: `${room.name} - ${file.originalname.replace(/\.[^.]+$/, "")}`,
      });
    }

    const savedImages = await addRoomImagesService(id, uploadedImages);

    return res.status(201).json({
      success: true,
      message: `${savedImages.length} foto(s) subida(s) correctamente`,
      data: savedImages,
    });
  } catch (error) {
    if (uploadedImages.length > 0) {
      await removeUploadedFiles(uploadedImages, "image");
    }

    return next(error);
  }
}

// Recibe varios videos elegidos desde la PC.
export async function uploadRoomVideosController(req, res, next) {
  const uploadedVideos = [];

  try {
    const { id } = req.params;
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar uno o más videos",
      });
    }

    const room = await getRoomByIdService(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    for (const file of files) {
      const result = await uploadBufferToCloudinary(file, {
        folder: `casa-huespedes-pimentel/rooms/${id}/videos`,
        resource_type: "video",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      const posterUrl = cloudinary.url(result.public_id, {
        secure: true,
        resource_type: "video",
        format: "jpg",
        transformation: [{ start_offset: "0" }],
      });

      uploadedVideos.push({
        url: result.secure_url,
        publicId: result.public_id,
        title: file.originalname.replace(/\.[^.]+$/, ""),
        posterUrl,
      });
    }

    const savedVideos = await addRoomVideosService(id, uploadedVideos);

    return res.status(201).json({
      success: true,
      message: `${savedVideos.length} video(s) subido(s) correctamente`,
      data: savedVideos,
    });
  } catch (error) {
    if (uploadedVideos.length > 0) {
      await removeUploadedFiles(uploadedVideos, "video");
    }

    return next(error);
  }
}
