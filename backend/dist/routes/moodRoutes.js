"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const moodController_1 = require("../controllers/moodController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All mood routes are protected with authenticateToken.
// That means only a logged-in user can create, read, update, or delete moods.
router.post("/", authMiddleware_1.authenticateToken, moodController_1.createMood);
router.get("/", authMiddleware_1.authenticateToken, moodController_1.getMoods);
router.put("/:id", authMiddleware_1.authenticateToken, moodController_1.updateMood);
router.delete("/:id", authMiddleware_1.authenticateToken, moodController_1.deleteMood);
exports.default = router;
