"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWellnessGuideRecommendationForUser = exports.answerWithRetrievalForUser = exports.semanticSearchForUser = exports.getKnowledgeDocumentsForUser = exports.createKnowledgeDocumentForUser = void 0;
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const ragServiceUrl_1 = require("../utils/ragServiceUrl");
const ragServiceAuth_1 = require("../utils/ragServiceAuth");
const safetyService_1 = require("./safetyService");
const normalizeRequiredString = (value, field, maxLength) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new AppError_1.AppError(`${field} is required.`, 400);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
        throw new AppError_1.AppError(`${field} must be ${maxLength} characters or fewer.`, 400);
    }
    return normalized;
};
const normalizeOptionalString = (value, field, maxLength) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "string") {
        throw new AppError_1.AppError(`${field} must be a string.`, 400);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
        throw new AppError_1.AppError(`${field} must be ${maxLength} characters or fewer.`, 400);
    }
    return normalized || undefined;
};
const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) {
        throw new AppError_1.AppError("Tags must be an array of strings.", 400);
    }
    return tags.map((tag, index) => {
        if (typeof tag !== "string" || tag.trim().length === 0) {
            throw new AppError_1.AppError(`Tag ${index + 1} must be a non-empty string.`, 400);
        }
        return tag.trim();
    });
};
const normalizeCategory = (category) => {
    if (category === undefined || category === null)
        return "User Wellness Notes";
    return normalizeRequiredString(category, "Category", 80);
};
const requireUserId = (userId) => {
    if (!Number.isInteger(userId) || userId <= 0) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    return userId;
};
const createKnowledgeDocumentForUser = async (userId, title, content, source, category = "User Wellness Notes", tags = []) => {
    const validatedUserId = requireUserId(userId);
    const normalizedTitle = normalizeRequiredString(title, "Title", 160);
    const normalizedContent = normalizeRequiredString(content, "Content", 20000);
    const normalizedSource = normalizeOptionalString(source, "Source", 500);
    const normalizedCategory = normalizeCategory(category);
    const normalizedTags = normalizeTags(tags);
    // Forward the request to the Python service, which creates embeddings and saves the document.
    const url = `${(0, ragServiceUrl_1.getRAGServiceUrl)({ requireConfigured: true })}/knowledge`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(0, ragServiceAuth_1.getRAGServiceAuthHeaders)() },
            body: JSON.stringify({
                user_id: validatedUserId,
                title: normalizedTitle,
                content: normalizedContent,
                source: normalizedSource,
                category: normalizedCategory,
                tags: normalizedTags,
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
    const validatedUserId = requireUserId(userId);
    const url = `${(0, ragServiceUrl_1.getRAGServiceUrl)({ requireConfigured: true })}/knowledge?user_id=${validatedUserId}`;
    try {
        const response = await fetch(url, { headers: (0, ragServiceAuth_1.getRAGServiceAuthHeaders)() });
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
    const validatedUserId = requireUserId(userId);
    const normalizedQuery = normalizeRequiredString(query, "Query", 1000);
    const requestedLimit = limit ?? 5;
    const normalizedLimit = typeof requestedLimit === "string" && /^\d+$/.test(requestedLimit)
        ? Number(requestedLimit)
        : requestedLimit;
    if (typeof normalizedLimit !== "number" || !Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 10) {
        throw new AppError_1.AppError("Limit must be an integer between 1 and 10.", 400);
    }
    // Semantic search means "find text with similar meaning", not just matching words.
    const url = `${(0, ragServiceUrl_1.getRAGServiceUrl)({ requireConfigured: true })}/search?user_id=${validatedUserId}&query=${encodeURIComponent(normalizedQuery)}&limit=${normalizedLimit}`;
    try {
        const response = await fetch(url, { headers: (0, ragServiceAuth_1.getRAGServiceAuthHeaders)() });
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
    const validatedUserId = requireUserId(userId);
    const normalizedQuestion = normalizeRequiredString(question, "Question", 4000);
    // /answer asks the Python service to search relevant knowledge and generate an answer.
    const url = `${(0, ragServiceUrl_1.getRAGServiceUrl)({ requireConfigured: true })}/answer`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(0, ragServiceAuth_1.getRAGServiceAuthHeaders)() },
            body: JSON.stringify({
                user_id: validatedUserId,
                question: normalizedQuestion,
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
                userId: validatedUserId,
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
    const validatedUserId = requireUserId(userId);
    const normalizedQuestion = normalizeRequiredString(question, "Question", 4000);
    const targetBase = (0, ragServiceUrl_1.getRAGServiceUrl)({ requireConfigured: true });
    const url = `${targetBase}/wellness-guide`;
    let resultData;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(0, ragServiceAuth_1.getRAGServiceAuthHeaders)() },
            body: JSON.stringify({
                user_id: validatedUserId,
                question: normalizedQuestion,
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
      `, [validatedUserId, normalizedQuestion]);
        // If safety crisis signal was triggered, log it and return safety response
        if (resultData.safety?.hasCrisisRisk) {
            await (0, safetyService_1.logSafetyEvent)({
                userId: validatedUserId,
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
      `, [validatedUserId, resultData.answer, JSON.stringify(resultData.recommendations || [])]);
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
