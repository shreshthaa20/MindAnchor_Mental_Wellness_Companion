"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRAGServiceUrl = void 0;
const AppError_1 = require("./AppError");
const DEFAULT_RAG_SERVICE_URL = "http://localhost:8000";
const getRAGServiceUrl = (options = {}) => {
    let url = process.env.RAG_SERVICE_URL;
    if (!url) {
        if (options.requireConfigured) {
            throw new AppError_1.AppError("RAG service URL is not configured.", 500);
        }
        url = DEFAULT_RAG_SERVICE_URL;
    }
    url = url.trim().replace(/\/+$/, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = url.includes(".onrender.com") ? `https://${url}` : `http://${url}`;
    }
    return url;
};
exports.getRAGServiceUrl = getRAGServiceUrl;
