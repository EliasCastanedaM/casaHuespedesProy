import { Router } from "express";
import {
  getAvailabilityController,
  searchAvailabilityController,
  searchCategoryAvailabilityController,
} from "./availability.controller.js";

const router = Router();

// Compatible con el frontend actual: devuelve un arreglo de habitaciones.
router.get("/", getAvailabilityController);

// Endpoint estructurado para el asesor y futuras búsquedas del frontend.
router.post("/search", searchAvailabilityController);

// Disponibilidad comercial agrupada por Matrimonial, Doble, Triple y Familiar.
router.post("/categories", searchCategoryAvailabilityController);

export default router;
