import express from "express";
import rateLimit from "express-rate-limit";
import {
  getCurrentUser,
  registerUser,
  loginUser,
} from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import {
  loginBodySchema,
  registerBodySchema,
} from "../validation/schemas";

const router = express.Router();

const authRateLimitResponse = {
  success: false,
  message: "Too many attempts. Please try again later.",
};

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitResponse,
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: authRateLimitResponse,
});

// Authentication Routes
router.post(
  "/register",
  registerRateLimiter,
  validateRequest({ body: registerBodySchema }),
  registerUser
);
router.post(
  "/login",
  loginRateLimiter,
  validateRequest({ body: loginBodySchema }),
  loginUser
);
router.get("/me", authenticateToken, getCurrentUser);

export default router;
