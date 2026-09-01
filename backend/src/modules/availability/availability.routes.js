import { Router } from "express";
import {
  getAvailabilityController,
  searchAvailabilityController,
} from "./availability.controller.js";

const router = Router();

// Compatible con el frontend actual: devuelve un arreglo de habitaciones.
router.get("/", getAvailabilityController);

// Endpoint estructurado para el asesor y futuras búsquedas del frontend.
router.post("/search", searchAvailabilityController);

export default router;
