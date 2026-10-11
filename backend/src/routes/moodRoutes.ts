import express from "express";
import {
  createMood,
  deleteMood,
  getMoods,
  updateMood,
} from "../controllers/moodController";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { idParamsSchema, moodBodySchema } from "../validation/schemas";

const router = express.Router();

// All mood routes are protected with authenticateToken.
// That means only a logged-in user can create, read, update, or delete moods.
router.post(
  "/",
  authenticateToken,
  validateRequest({ body: moodBodySchema }),
  createMood
);
router.get("/", authenticateToken, getMoods);
router.put(
  "/:id",
  authenticateToken,
  validateRequest({ params: idParamsSchema, body: moodBodySchema }),
  updateMood
);
router.delete(
  "/:id",
  authenticateToken,
  validateRequest({ params: idParamsSchema }),
  deleteMood
);

export default router;
