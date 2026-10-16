import { AppError } from "./AppError";

export const getRAGServiceAuthHeaders = (): Record<string, string> => {
  const apiKey = process.env.RAG_SERVICE_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError("RAG service authentication is not configured.", 500);
  }

  return { "X-Internal-API-Key": apiKey };
};
