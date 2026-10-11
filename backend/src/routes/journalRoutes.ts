import express from "express";
import {
  createJournal,
  deleteJournal,
  getJournal,
  getJournals,
  updateJournal,
} from "../controllers/journalController";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import {
  idParamsSchema,
  journalBodySchema,
} from "../validation/schemas";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  validateRequest({ body: journalBodySchema }),
  createJournal
);
router.get("/", authenticateToken, getJournals);
router.get(
  "/:id",
  authenticateToken,
  validateRequest({ params: idParamsSchema }),
  getJournal
);
router.put(
  "/:id",
  authenticateToken,
  validateRequest({ params: idParamsSchema, body: journalBodySchema }),
  updateJournal
);
router.delete(
  "/:id",
  authenticateToken,
  validateRequest({ params: idParamsSchema }),
  deleteJournal
);

export default router;
