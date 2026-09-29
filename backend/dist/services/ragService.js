"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWellnessGuideRecommendationForUser = exports.answerWithRetrievalForUser = exports.semanticSearchForUser = exports.getKnowledgeDocumentsForUser = exports.createKnowledgeDocumentForUser = void 0;
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const safetyService_1 = require("./safetyService");
const getRAGServiceUrl = () => {
    // The Python AI service URL must be configured because this file acts as a bridge to it.
    let url = process.env.RAG_SERVICE_URL;
    if (!url) {
        throw new AppError_1.AppError("RAG service URL is not configured.", 500);
    }
    url = url.trim().replace(/\/+$/, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        // If it's a Render internal service name or public domain without protocol
        if (url.includes(".onrender.com")) {
            url = `https://${url}`;
        }
        else {
            url = `http://${url}`;
        }
    }
    return url;
};
const createKnowledgeDocumentForUser = async (userId, title, content, source, category = "User Wellness Notes", tags = []) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    // Forward the request to the Python service, which creates embeddings and saves the document.
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
            throw new AppError_1.AppError(errData.detail || "Failed to create knowledge document in RAG service.", response.status);
        }
        const data = await response.json();
        return data.document;
    }
    catch (error) {
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`RAG service error: ${error.message}`, 502);
    }
};
exports.createKnowledgeDocumentForUser = createKnowledgeDocumentForUser;
const getKnowledgeDocumentsForUser = async (userId) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    const url = `${getRAGServiceUrl()}/knowledge?user_id=${userId}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new AppError_1.AppError(errData.detail || "Failed to fetch knowledge documents from RAG service.", response.status);
        }
        const data = await response.json();
        return data.documents;
    }
    catch (error) {
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`RAG service error: ${error.message}`, 502);
    }
};
exports.getKnowledgeDocumentsForUser = getKnowledgeDocumentsForUser;
const semanticSearchForUser = async (userId, query, limit) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    // Semantic search means "find text with similar meaning", not just matching words.
    const url = `${getRAGServiceUrl()}/search?user_id=${userId}&query=${encodeURIComponent(String(query || ""))}&limit=${limit || 5}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new AppError_1.AppError(errData.detail || "Failed to run semantic search in RAG service.", response.status);
        }
        const data = await response.json();
        return data.results;
    }
    catch (error) {
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`RAG service error: ${error.message}`, 502);
    }
};
exports.semanticSearchForUser = semanticSearchForUser;
const answerWithRetrievalForUser = async (userId, question) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    // /answer asks the Python service to search relevant knowledge and generate an answer.
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
            throw new AppError_1.AppError(errData.detail || "Failed to generate RAG answer from RAG service.", response.status);
        }
        const data = await response.json();
        // Check if safety risk was identified
        if (data.safety?.hasCrisisRisk) {
            await (0, safetyService_1.logSafetyEvent)({
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
    }
    catch (error) {
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`RAG service error: ${error.message}`, 502);
    }
};
exports.answerWithRetrievalForUser = answerWithRetrievalForUser;
const createWellnessGuideRecommendationForUser = async (userId, question) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    const targetBase = getRAGServiceUrl();
    const url = `${targetBase}/wellness-guide`;
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
            throw new AppError_1.AppError(errData.detail || "Failed to generate wellness guide from RAG service.", response.status);
        }
        resultData = await response.json();
    }
    catch (error) {
        console.error(`[RAG Service Connection Error] Failed to call ${url}:`, error);
        if (error instanceof AppError_1.AppError)
            throw error;
        throw new AppError_1.AppError(`RAG service error (${url}): ${error.message}`, 502);
    }
    const client = await database_1.pool.connect();
    try {
        await client.query("BEGIN");
        const userMessageResult = await client.query(`
      INSERT INTO chat_messages (user_id, role, chat_type, content)
      VALUES ($1, 'user', 'wellness_guide', $2)
      RETURNING *
      `, [userId, String(question)]);
        // If safety crisis signal was triggered, log it and return safety response
        if (resultData.safety?.hasCrisisRisk) {
            await (0, safetyService_1.logSafetyEvent)({
                userId,
                eventType: "wellness_guide_crisis_signal",
                riskLevel: resultData.safety.riskLevel,
                source: "wellness_guide",
                message: String(question),
            });
        }
        const assistantMessageResult = await client.query(`
      INSERT INTO chat_messages (user_id, role, chat_type, content, recommendations)
      VALUES ($1, 'assistant', 'wellness_guide', $2, $3::jsonb)
      RETURNING *
      `, [userId, resultData.answer, JSON.stringify(resultData.recommendations || [])]);
        await client.query("COMMIT");
        return {
            userMessage: userMessageResult.rows[0],
            assistantMessage: assistantMessageResult.rows[0],
            sources: resultData.sources,
        };
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createWellnessGuideRecommendationForUser = createWellnessGuideRecommendationForUser;
