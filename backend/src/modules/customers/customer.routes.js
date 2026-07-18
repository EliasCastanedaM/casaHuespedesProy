// Importamos Router de Express
import { Router } from "express";

// Importamos controladores de clientes
import {
  getAllCustomersController,
  getCustomerByIdController,
} from "./customer.controller.js";

// Creamos router de clientes
const router = Router();

// Ruta para listar clientes
router.get("/", getAllCustomersController);

// Ruta para ver detalle de cliente
router.get("/:id", getCustomerByIdController);

// Exportamos router
export default router;