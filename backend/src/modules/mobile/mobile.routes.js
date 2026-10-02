import { Router } from "express";
import {
  createMobileBookingController,
  cancelMobileBookingController,
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
router.delete("/bookings/:id", cancelMobileBookingController);

export default router;
