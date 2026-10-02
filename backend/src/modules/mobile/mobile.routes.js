import { Router } from "express";
import {
  createMobileBookingController,
  getMobileBookingsController,
  getMobileDashboardController,
  getMobileCategoriesController,
  getMobileRoomsController,
} from "./mobile.controller.js";

const router = Router();


router.get("/dashboard", getMobileDashboardController);
router.get("/categories", getMobileCategoriesController);
router.get("/rooms", getMobileRoomsController);
router.get("/bookings", getMobileBookingsController);
router.post("/bookings", createMobileBookingController);

export default router;
