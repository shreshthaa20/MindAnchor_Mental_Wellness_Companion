import { pgTable, serial, varchar, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(), // length 255
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), // without timezone
});

export const moods = pgTable("moods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mood: varchar("mood", { length: 50 }).notNull(), // length 50
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(), // without timezone
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});

export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  chatType: varchar("chat_type", { length: 20 }).default("wellness_guide").notNull(),
  recommendations: jsonb("recommendations"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});

export const safetyEvents = pgTable("safety_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 40 }).notNull(), // length 40
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  source: varchar("source", { length: 40 }).notNull(), // length 40
  messagePreview: text("message_preview").notNull(), // text type
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), // with timezone
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 80 }).default("General Wellness").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  content: text("content").notNull(),
  source: text("source"),
  tags: text("tags").array().default(sql`'{}'`).notNull(),
  isCurated: boolean("is_curated").default(false).notNull(),
  embedding: text("embedding").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
