import { pool } from "../config/database";
import { AppError } from "../utils/AppError";
import { logSafetyEvent } from "./safetyService";

export interface KnowledgeDocument {
  id: number;
  user_id: number | null;
  category: string;
  title: string;
  content: string;
  source: string | null;
  tags: string[];
  is_curated: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SemanticSearchResult extends KnowledgeDocument {
  similarity: number;
}

const getRAGServiceUrl = (): string => {
  let url = process.env.RAG_SERVICE_URL;
  if (!url) {
    throw new AppError("RAG service URL is not configured.", 500);
  }
  url = url.trim().replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // If it's a Render internal service name or public domain without protocol
    if (url.includes(".onrender.com")) {
      url = `https://${url}`;
    } else {
      url = `http://${url}`;
    }
  }
  return url;
};

export const createKnowledgeDocumentForUser = async (
  userId: number | undefined,
  title: unknown,
  content: unknown,
  source: unknown,
  category: unknown = "User Wellness Notes",
  tags: unknown = []
): Promise<KnowledgeDocument> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const url = `${getRAGServiceUrl()}/knowledge`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title,
        content,
        source,
        category,
        tags,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new AppError(errData.detail || "Failed to create knowledge document in RAG service.", response.status);
    }

    const data = await response.json();
    return data.document;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`RAG service error: ${(error as Error).message}`, 502);
  }
};

export const getKnowledgeDocumentsForUser = async (
  userId: number | undefined
): Promise<KnowledgeDocument[]> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const url = `${getRAGServiceUrl()}/knowledge?user_id=${userId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new AppError(errData.detail || "Failed to fetch knowledge documents from RAG service.", response.status);
    }

    const data = await response.json();
    return data.documents;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`RAG service error: ${(error as Error).message}`, 502);
  }
};

export const semanticSearchForUser = async (
  userId: number | undefined,
  query: unknown,
  limit: unknown
): Promise<SemanticSearchResult[]> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const url = `${getRAGServiceUrl()}/search?user_id=${userId}&query=${encodeURIComponent(String(query || ""))}&limit=${limit || 5}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new AppError(errData.detail || "Failed to run semantic search in RAG service.", response.status);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`RAG service error: ${(error as Error).message}`, 502);
  }
};

export const answerWithRetrievalForUser = async (
  userId: number | undefined,
  question: unknown
): Promise<{
  answer: string;
  recommendations: any[];
  sources: SemanticSearchResult[];
}> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const url = `${getRAGServiceUrl()}/answer`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        question,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new AppError(errData.detail || "Failed to generate RAG answer from RAG service.", response.status);
    }

    const data = await response.json();
    
    // Check if safety risk was identified
    if (data.safety?.hasCrisisRisk) {
      await logSafetyEvent({
        userId,
        eventType: "rag_crisis_signal",
        riskLevel: data.safety.riskLevel,
        source: "rag",
        message: String(question),
      });
    }

    return {
      answer: data.answer,
      recommendations: data.recommendations || [],
      sources: data.sources,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`RAG service error: ${(error as Error).message}`, 502);
  }
};

export const createWellnessGuideRecommendationForUser = async (
  userId: number | undefined,
  question: unknown
): Promise<{
  userMessage: {
    id: number;
    user_id: number;
    role: "user";
    chat_type: "wellness_guide";
    content: string;
    created_at: Date;
  };
  assistantMessage: {
    id: number;
    user_id: number;
    role: "assistant";
    chat_type: "wellness_guide";
    content: string;
    created_at: Date;
  };
  sources: SemanticSearchResult[];
}> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const url = `${getRAGServiceUrl()}/wellness-guide`;
  let resultData;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        question,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new AppError(errData.detail || "Failed to generate wellness guide from RAG service.", response.status);
    }

    resultData = await response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`RAG service error: ${(error as Error).message}`, 502);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userMessageResult = await client.query(
      `
      INSERT INTO chat_messages (user_id, role, chat_type, content)
      VALUES ($1, 'user', 'wellness_guide', $2)
      RETURNING *
      `,
      [userId, String(question)]
    );

    // If safety crisis signal was triggered, log it and return safety response
    if (resultData.safety?.hasCrisisRisk) {
      await logSafetyEvent({
        userId,
        eventType: "wellness_guide_crisis_signal",
        riskLevel: resultData.safety.riskLevel,
        source: "wellness_guide",
        message: String(question),
      });
    }

    const assistantMessageResult = await client.query(
      `
      INSERT INTO chat_messages (user_id, role, chat_type, content, recommendations)
      VALUES ($1, 'assistant', 'wellness_guide', $2, $3::jsonb)
      RETURNING *
      `,
      [userId, resultData.answer, JSON.stringify(resultData.recommendations || [])]
    );

    await client.query("COMMIT");

    return {
      userMessage: userMessageResult.rows[0],
      assistantMessage: assistantMessageResult.rows[0],
      sources: resultData.sources,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
