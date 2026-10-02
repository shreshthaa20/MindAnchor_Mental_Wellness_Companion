"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBase = exports.safetyEvents = exports.chatMessages = exports.journals = exports.moods = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).unique().notNull(), // length 255
    password: (0, pg_core_1.varchar)("password", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(), // without timezone
});
exports.moods = (0, pg_core_1.pgTable)("moods", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    mood: (0, pg_core_1.varchar)("mood", { length: 50 }).notNull(), // length 50
    note: (0, pg_core_1.text)("note"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(), // without timezone
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});
exports.journals = (0, pg_core_1.pgTable)("journals", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 120 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});
exports.chatMessages = (0, pg_core_1.pgTable)("chat_messages", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    chatType: (0, pg_core_1.varchar)("chat_type", { length: 20 }).default("wellness_guide").notNull(),
    recommendations: (0, pg_core_1.jsonb)("recommendations"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});
exports.safetyEvents = (0, pg_core_1.pgTable)("safety_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 40 }).notNull(), // length 40
    riskLevel: (0, pg_core_1.varchar)("risk_level", { length: 20 }).notNull(),
    source: (0, pg_core_1.varchar)("source", { length: 40 }).notNull(), // length 40
    messagePreview: (0, pg_core_1.text)("message_preview").notNull(), // text type
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});
exports.knowledgeBase = (0, pg_core_1.pgTable)("knowledge_base", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }),
    category: (0, pg_core_1.varchar)("category", { length: 80 }).default("General Wellness").notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 160 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    source: (0, pg_core_1.text)("source"),
    tags: (0, pg_core_1.text)("tags").array().default((0, drizzle_orm_1.sql) `'{}'`).notNull(),
    isCurated: (0, pg_core_1.boolean)("is_curated").default(false).notNull(),
    embedding: (0, pg_core_1.text)("embedding").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
