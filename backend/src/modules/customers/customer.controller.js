// Importamos servicios de clientes
import {
  getAllCustomersService,
  getCustomerByIdService,
} from "./customer.service.js";

// Controlador para listar clientes frecuentes
export async function getAllCustomersController(req, res, next) {
  try {
    // Obtenemos clientes desde el servicio
    const customers = await getAllCustomersService();

    // Respondemos al frontend
    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
}

// Controlador para obtener detalle de un cliente
export async function getCustomerByIdController(req, res, next) {
  try {
    // Obtenemos el ID desde la URL
    const { id } = req.params;

    // Buscamos cliente
    const result = await getCustomerByIdService(id);

    // Si no existe, devolvemos 404
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Respondemos con cliente y reservas
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}