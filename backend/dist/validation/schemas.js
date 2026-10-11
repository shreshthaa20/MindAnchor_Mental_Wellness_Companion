"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionBodySchema = exports.semanticSearchQuerySchema = exports.knowledgeBodySchema = exports.chatMessageBodySchema = exports.chatHistoryQuerySchema = exports.journalBodySchema = exports.moodBodySchema = exports.loginBodySchema = exports.registerBodySchema = exports.idParamsSchema = void 0;
const zod_1 = require("zod");
const requiredString = (field, refine = (schema) => schema) => zod_1.z.preprocess((value) => (typeof value === "string" ? value.trim() : value), refine(zod_1.z.string(`${field} is required`).min(1, `${field} is required`)));
const optionalString = (refine = (schema) => schema) => zod_1.z.preprocess((value) => (typeof value === "string" ? value.trim() : value), refine(zod_1.z.string()).optional());
exports.idParamsSchema = zod_1.z.object({
    id: requiredString("id", (schema) => schema.regex(/^\d+$/, "id must be a positive integer")),
});
exports.registerBodySchema = zod_1.z.object({
    name: requiredString("name", (schema) => schema.max(100, "name must be 100 characters or fewer")),
    email: requiredString("email", (schema) => schema
        .email("email must be valid")
        .max(255, "email must be 255 characters or fewer")),
    password: requiredString("password", (schema) => schema.min(8, "password must be at least 8 characters")),
});
exports.loginBodySchema = zod_1.z.object({
    email: requiredString("email", (schema) => schema.email("email must be valid")),
    password: requiredString("password"),
});
exports.moodBodySchema = zod_1.z.object({
    mood: requiredString("mood", (schema) => schema.max(50, "mood must be 50 characters or fewer")),
});
exports.journalBodySchema = zod_1.z.object({
    title: requiredString("title", (schema) => schema.max(120, "title must be 120 characters or fewer")),
    content: requiredString("content", (schema) => schema.max(10000, "content must be 10000 characters or fewer")),
});
exports.chatHistoryQuerySchema = zod_1.z.object({
    type: zod_1.z.string().optional(),
});
exports.chatMessageBodySchema = zod_1.z.object({
    message: requiredString("message", (schema) => schema.max(4000, "message must be 4000 characters or fewer")),
    type: zod_1.z.string().optional(),
});
exports.knowledgeBodySchema = zod_1.z.object({
    title: requiredString("title", (schema) => schema.max(160, "title must be 160 characters or fewer")),
    content: requiredString("content", (schema) => schema.max(20000, "content must be 20000 characters or fewer")),
    source: optionalString((schema) => schema.max(500, "source must be 500 characters or fewer")),
    category: zod_1.z
        .preprocess((value) => (typeof value === "string" ? value.trim() : value), zod_1.z
        .string()
        .min(1, "category is required")
        .max(80, "category must be 80 characters or fewer"))
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().min(1, "tag cannot be empty")).optional(),
});
exports.semanticSearchQuerySchema = zod_1.z.object({
    query: requiredString("query", (schema) => schema.max(1000, "query must be 1000 characters or fewer")),
    limit: zod_1.z
        .string()
        .regex(/^\d+$/, "limit must be a positive integer")
        .optional(),
});
exports.questionBodySchema = zod_1.z.object({
    question: requiredString("question", (schema) => schema.max(4000, "question must be 4000 characters or fewer")),
});
