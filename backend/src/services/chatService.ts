import { pool } from "../config/database";
import { AppError } from "../utils/AppError";
import { chatInstructions } from "./aiPromptService";
import { assessSafetyRisk, logSafetyEvent } from "./safetyService";

export interface ChatMessage {
  id: number;
  user_id: number;
  role: "user" | "assistant";
  chat_type: ChatType;
  content: string;
  created_at: Date;
}

export type ChatType = "wellness_guide";

const normalizeChatType = (chatType: unknown): ChatType => {
  // The app currently supports only one chat mode.
  // Returning a fixed value prevents unsupported chat types from entering the DB.
  return "wellness_guide";
};

const normalizeMessage = (message: unknown): string => {
  // Messages come from the frontend, so validate before using them.
  if (typeof message !== "string" || message.trim().length === 0) {
    throw new AppError("Message is required.", 400);
  }

  if (message.trim().length > 4000) {
    throw new AppError("Message must be 4000 characters or fewer.", 400);
  }

  return message.trim();
};

export const getChatHistoryForUser = async (
  userId: number | undefined,
  chatType: unknown
): Promise<ChatMessage[]> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const normalizedChatType = normalizeChatType(chatType);

  const result = await pool.query<ChatMessage>(
    `
    SELECT *
    FROM chat_messages
    WHERE user_id = $1 AND chat_type = $2
    ORDER BY created_at ASC
    `,
    [userId, normalizedChatType]
  );

  return result.rows;
};

export const createChatResponseForUser = async (
  userId: number | undefined,
  message: unknown,
  chatType: unknown
): Promise<{
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const normalizedMessage = normalizeMessage(message);
  const normalizedChatType = normalizeChatType(chatType);

  // A transaction lets us save the user message and assistant response together.
  // If something fails, ROLLBACK undoes the partial work.
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Save what the user typed before generating the AI reply.
    const userMessageResult = await client.query<ChatMessage>(
      `
      INSERT INTO chat_messages (user_id, role, chat_type, content)
      VALUES ($1, 'user', $2, $3)
      RETURNING *
      `,
      [userId, normalizedChatType, normalizedMessage]
    );

    // Safety checks run before calling the AI service.
    // If the message looks urgent, the app returns a crisis-support response.
    const safetyAssessment = assessSafetyRisk(normalizedMessage);

    if (safetyAssessment.hasCrisisRisk && safetyAssessment.response) {
      await logSafetyEvent({
        userId,
        eventType: "chat_crisis_signal",
        riskLevel: safetyAssessment.riskLevel,
        source: normalizedChatType,
        message: normalizedMessage,
      });

      const assistantMessageResult = await client.query<ChatMessage>(
        `
        INSERT INTO chat_messages (user_id, role, chat_type, content)
        VALUES ($1, 'assistant', $2, $3)
        RETURNING *
        `,
        [userId, normalizedChatType, safetyAssessment.response]
      );

      await client.query("COMMIT");

      return {
        userMessage: userMessageResult.rows[0],
        assistantMessage: assistantMessageResult.rows[0],
      };
    }

    // Fetch recent conversation history so the AI has context.
    const historyResult = await client.query<ChatMessage>(
      `
      SELECT *
      FROM chat_messages
      WHERE user_id = $1 AND chat_type = $2
      ORDER BY created_at DESC
      LIMIT 12
      `,
      [userId, normalizedChatType]
    );

    const history = historyResult.rows.reverse().map((item) => ({
      role: item.role,
      content: item.content,
    }));

    let assistantText = "";

    try {
      // The Node backend calls the Python RAG service for AI generation.
      // RAG_SERVICE_URL is usually http://localhost:8000 in development.
      let baseUrl = process.env.RAG_SERVICE_URL || "http://localhost:8000";
      baseUrl = baseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = baseUrl.includes(".onrender.com") ? `https://${baseUrl}` : `http://${baseUrl}`;
      }
      const url = `${baseUrl}/chat`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          chat_type: normalizedChatType,
          messages: history,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new AppError(errData.detail || "Failed to generate chat response from RAG service.", response.status);
      }

      const data = await response.json();
      assistantText = data.answer;
    } catch (error) {
      // If the AI service is down, return a safe fallback instead of failing the chat.
      console.error("DEBUG Node.js COMPANION ERROR:", error);
      const fallbackText =
        "I'm here with you. I can't reach the AI service right now, but you can still take one small grounding step: pause, take a slow breath, and name one thing you need in this moment. If this is urgent or you may not be safe, please contact local emergency services or a trusted person immediately.";

      await logSafetyEvent({
        userId,
        eventType: "chat_ai_fallback",
        riskLevel: "none",
        source: normalizedChatType,
        message: normalizedMessage,
      });

      const assistantMessageResult = await client.query<ChatMessage>(
        `
        INSERT INTO chat_messages (user_id, role, chat_type, content)
        VALUES ($1, 'assistant', $2, $3)
        RETURNING *
        `,
        [userId, normalizedChatType, fallbackText]
      );

      await client.query("COMMIT");

      return {
        userMessage: userMessageResult.rows[0],
        assistantMessage: assistantMessageResult.rows[0],
      };
    }

    if (!assistantText) {
      throw new AppError("AI response was empty.", 502);
    }

    // Save the assistant's AI-generated reply.
    const assistantMessageResult = await client.query<ChatMessage>(
      `
      INSERT INTO chat_messages (user_id, role, chat_type, content)
      VALUES ($1, 'assistant', $2, $3)
      RETURNING *
      `,
      [userId, normalizedChatType, assistantText]
    );

    await client.query("COMMIT");

    return {
      userMessage: userMessageResult.rows[0],
      assistantMessage: assistantMessageResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
