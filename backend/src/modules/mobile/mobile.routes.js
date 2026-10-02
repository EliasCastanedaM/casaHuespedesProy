import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import {
  createMobileBookingController,
  getMobileBookingsController,
  getMobileDashboardController,
  getMobileRoomsController,
} from "./mobile.controller.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/dashboard", getMobileDashboardController);
router.get("/rooms", getMobileRoomsController);
router.get("/bookings", getMobileBookingsController);
router.post("/bookings", createMobileBookingController);

export default router;
