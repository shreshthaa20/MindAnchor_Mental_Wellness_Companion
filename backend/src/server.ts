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

// app.listen starts the HTTP server. Database migrations are run separately,
// so starting the API never changes existing chat records.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
