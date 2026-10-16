"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRAGServiceAuthHeaders = void 0;
const AppError_1 = require("./AppError");
const getRAGServiceAuthHeaders = () => {
    const apiKey = process.env.RAG_SERVICE_API_KEY?.trim();
    if (!apiKey) {
        throw new AppError_1.AppError("RAG service authentication is not configured.", 500);
    }
    return { "X-Internal-API-Key": apiKey };
};
exports.getRAGServiceAuthHeaders = getRAGServiceAuthHeaders;
