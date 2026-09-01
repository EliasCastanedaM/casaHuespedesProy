// Importamos Router de Express
import { Router } from "express";

// Importamos controladores de clientes
import {
  getAllCustomersController,
  getCustomerByIdController,
} from "./customer.controller.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";

// Creamos router de clientes
const router = Router();

// Ruta para listar clientes
router.get("/", requireAdminAuth, getAllCustomersController);

// Ruta para ver detalle de cliente
router.get("/:id", requireAdminAuth, getCustomerByIdController);

// Exportamos router
export default router;
