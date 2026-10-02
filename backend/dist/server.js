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
// app.listen starts the HTTP server. Database migrations are run separately,
// so starting the API never changes existing chat records.
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
