"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const moodRoutes_1 = __importDefault(require("./routes/moodRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const journalRoutes_1 = __importDefault(require("./routes/journalRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const ragRoutes_1 = __importDefault(require("./routes/ragRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Create a small log for every incoming request.
// Example: [date] POST /api/auth/login
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// cors() lets the Flutter app call this backend from another origin.
app.use((0, cors_1.default)());
// express.json() tells Express to read JSON request bodies into req.body.
app.use(express_1.default.json());
// Each app.use below mounts a group of routes under one URL prefix.
// Example: authRoutes contains /login, so the full URL becomes /api/auth/login.
app.use("/api/auth", authRoutes_1.default);
app.use("/api/moods", moodRoutes_1.default);
app.use("/api/journals", journalRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/chat", chatRoutes_1.default);
app.use("/api/rag", ragRoutes_1.default);
// Example protected route.
// authenticateToken verifies the JWT first, then the handler can read req.user.
app.get("/api/profile", authMiddleware_1.authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});
const PORT = process.env.PORT || 5000;
// app.listen starts the HTTP server.
// The async callback also runs a small database setup/migration when the server starts.
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Run database migration to fix constraints
    try {
        const client = await database_1.pool.connect();
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
    }
    catch (err) {
        console.error("Database migration error:", err);
    }
});
