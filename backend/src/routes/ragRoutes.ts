import express from "express";
import {
  answerWithRetrieval,
  createWellnessGuideRecommendation,
  createKnowledgeDocument,
  getKnowledgeDocuments,
  semanticSearch,
} from "../controllers/ragController";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import {
  knowledgeBodySchema,
  questionBodySchema,
  semanticSearchQuerySchema,
} from "../validation/schemas";

const router = express.Router();

router.post(
  "/knowledge",
  authenticateToken,
  validateRequest({ body: knowledgeBodySchema }),
  createKnowledgeDocument
);
router.get("/knowledge", authenticateToken, getKnowledgeDocuments);
router.get(
  "/search",
  authenticateToken,
  validateRequest({ query: semanticSearchQuerySchema }),
  semanticSearch
);
router.post(
  "/answer",
  authenticateToken,
  validateRequest({ body: questionBodySchema }),
  answerWithRetrieval
);
router.post(
  "/wellness-guide",
  authenticateToken,
  validateRequest({ body: questionBodySchema }),
  createWellnessGuideRecommendation
);

export default router;
