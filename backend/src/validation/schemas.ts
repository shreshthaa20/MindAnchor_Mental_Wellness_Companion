import { z } from "zod";

const requiredString = (
  field: string,
  refine: (schema: z.ZodString) => z.ZodString = (schema) => schema
) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    refine(z.string(`${field} is required`).min(1, `${field} is required`))
  );

const optionalString = (
  refine: (schema: z.ZodString) => z.ZodString = (schema) => schema
) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    refine(z.string()).optional()
  );

export const idParamsSchema = z.object({
  id: requiredString("id", (schema) =>
    schema.regex(/^\d+$/, "id must be a positive integer")
  ),
});

export const registerBodySchema = z.object({
  name: requiredString("name", (schema) =>
    schema.max(100, "name must be 100 characters or fewer")
  ),
  email: requiredString("email", (schema) =>
    schema
      .email("email must be valid")
      .max(255, "email must be 255 characters or fewer")
  ),
  password: requiredString("password", (schema) =>
    schema.min(8, "password must be at least 8 characters")
  ),
});

export const loginBodySchema = z.object({
  email: requiredString("email", (schema) =>
    schema.email("email must be valid")
  ),
  password: requiredString("password"),
});

export const moodBodySchema = z.object({
  mood: requiredString("mood", (schema) =>
    schema.max(50, "mood must be 50 characters or fewer")
  ),
});

export const journalBodySchema = z.object({
  title: requiredString("title", (schema) =>
    schema.max(120, "title must be 120 characters or fewer")
  ),
  content: requiredString("content", (schema) =>
    schema.max(10000, "content must be 10000 characters or fewer")
  ),
});

export const chatHistoryQuerySchema = z.object({
  type: z.string().optional(),
});

export const chatMessageBodySchema = z.object({
  message: requiredString("message", (schema) =>
    schema.max(4000, "message must be 4000 characters or fewer")
  ),
  type: z.string().optional(),
});

export const knowledgeBodySchema = z.object({
  title: requiredString("title", (schema) =>
    schema.max(160, "title must be 160 characters or fewer")
  ),
  content: requiredString("content", (schema) =>
    schema.max(20000, "content must be 20000 characters or fewer")
  ),
  source: optionalString((schema) =>
    schema.max(500, "source must be 500 characters or fewer")
  ),
  category: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z
        .string()
        .min(1, "category is required")
        .max(80, "category must be 80 characters or fewer")
    )
    .optional(),
  tags: z.array(z.string().trim().min(1, "tag cannot be empty")).optional(),
});

export const semanticSearchQuerySchema = z.object({
  query: requiredString("query", (schema) =>
    schema.max(1000, "query must be 1000 characters or fewer")
  ),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .optional(),
});

export const questionBodySchema = z.object({
  question: requiredString("question", (schema) =>
    schema.max(4000, "question must be 4000 characters or fewer")
  ),
});
