import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import moodRoutes from "./routes/moodRoutes";
import authRoutes from "./routes/authRoutes";
import journalRoutes from "./routes/journalRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import chatRoutes from "./routes/chatRoutes";
import ragRoutes from "./routes/ragRoutes";
import {
  authenticateToken,
  AuthRequest,
} from "./middleware/authMiddleware";
import { pool } from "./config/database";

dotenv.config();

const app = express();

// Create a small log for every incoming request.
// Example: [date] POST /api/auth/login
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// cors() lets the Flutter app call this backend from another origin.
app.use(cors());

// express.json() tells Express to read JSON request bodies into req.body.
app.use(express.json());

// Each app.use below mounts a group of routes under one URL prefix.
// Example: authRoutes contains /login, so the full URL becomes /api/auth/login.
app.use("/api/auth", authRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/rag", ragRoutes);

// Example protected route.
// authenticateToken verifies the JWT first, then the handler can read req.user.
app.get(
  "/api/profile",
  authenticateToken,
  (req: AuthRequest, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

const PORT = process.env.PORT || 5000;

// app.listen starts the HTTP server.
// The async callback also runs a small database setup/migration when the server starts.
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Run database migration to fix constraints
  try {
    const client = await pool.connect();
    console.log("Database connection successful. Migrating chat constraints...");
    await client.query("BEGIN");
    
    // pgvector is needed for storing/searching AI embeddings in PostgreSQL.
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    
    await client.query("ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_chat_type_check");
    // Ensure all existing messages are set to wellness_guide
    await client.query("UPDATE chat_messages SET chat_type = 'wellness_guide' WHERE chat_type IS NULL OR chat_type != 'wellness_guide'");
    await client.query("ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_chat_type_check CHECK (chat_type = 'wellness_guide')");
    await client.query("COMMIT");
    console.log("Migration successful: Allowed chat types restricted to wellness_guide & vector extension verified.");
    client.release();
  } catch (err) {
    console.error("Database migration error:", err);
  }
});
