import express from "express";
import {
  getChatHistory,
  sendChatMessage,
} from "../controllers/chatController";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import {
  chatHistoryQuerySchema,
  chatMessageBodySchema,
} from "../validation/schemas";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  validateRequest({ query: chatHistoryQuerySchema }),
  getChatHistory
);
router.post(
  "/",
  authenticateToken,
  validateRequest({ body: chatMessageBodySchema }),
  sendChatMessage
);

export default router;
