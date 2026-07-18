// Importamos servicios de galería
import {
  getPublicGalleryService,
  getAllGalleryService,
  createGalleryItemService,
  updateGalleryItemService,
  deleteGalleryItemService,
} from "./gallery.service.js";

// Controlador para listar galería pública
export async function getPublicGalleryController(req, res, next) {
  try {
    const items = await getPublicGalleryService();

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

// Controlador para listar galería admin
export async function getAllGalleryController(req, res, next) {
  try {
    const items = await getAllGalleryService();

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

// Controlador para crear imagen/video de galería
export async function createGalleryItemController(req, res, next) {
  try {
    const data = req.body;

    if (!data.title || !data.url) {
      return res.status(400).json({
        success: false,
        message: "El título y la URL son obligatorios",
      });
    }

    const item = await createGalleryItemService(data);

    res.status(201).json({
      success: true,
      message: "Elemento de galería creado correctamente",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

// Controlador para actualizar galería
export async function updateGalleryItemController(req, res, next) {
  try {
    const { id } = req.params;

    const item = await updateGalleryItemService(id, req.body);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Elemento de galería no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Elemento de galería actualizado correctamente",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}

// Controlador para eliminar galería
export async function deleteGalleryItemController(req, res, next) {
  try {
    const { id } = req.params;

    const item = await deleteGalleryItemService(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Elemento de galería no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Elemento de galería eliminado correctamente",
      data: item,
    });
  } catch (error) {
    next(error);
  }
}