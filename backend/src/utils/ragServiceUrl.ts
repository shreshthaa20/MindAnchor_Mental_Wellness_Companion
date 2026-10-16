import { AppError } from "./AppError";

const DEFAULT_RAG_SERVICE_URL = "http://localhost:8000";

interface RAGServiceUrlOptions {
  requireConfigured?: boolean;
}

export const getRAGServiceUrl = (options: RAGServiceUrlOptions = {}): string => {
  let url = process.env.RAG_SERVICE_URL;

  if (!url) {
    if (options.requireConfigured) {
      throw new AppError("RAG service URL is not configured.", 500);
    }

    url = DEFAULT_RAG_SERVICE_URL;
  }

  url = url.trim().replace(/\/+$/, "");

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = url.includes(".onrender.com") ? `https://${url}` : `http://${url}`;
  }

  return url;
};
