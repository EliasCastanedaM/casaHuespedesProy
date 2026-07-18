import {
  createInquiryService,
  getAllInquiriesService,
  updateInquiryStatusService,
} from "./inquiry.service.js";

export async function createInquiryController(req, res, next) {
  try {
    const { customer_name, phone, message } = req.body;

    if (!customer_name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Nombre, celular y mensaje son obligatorios.",
      });
    }

    const inquiry = await createInquiryService(req.body);

    return res.status(201).json({
      success: true,
      message: "Consulta registrada correctamente.",
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllInquiriesController(req, res, next) {
  try {
    const inquiries = await getAllInquiriesService();

    return res.json({
      success: true,
      data: inquiries,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInquiryStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "El estado es obligatorio.",
      });
    }

    const inquiry = await updateInquiryStatusService(id, status);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Consulta no encontrada.",
      });
    }

    return res.json({
      success: true,
      message: "Estado actualizado correctamente.",
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
}
