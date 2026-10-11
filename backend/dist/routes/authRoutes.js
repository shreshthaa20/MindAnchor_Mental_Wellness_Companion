"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validateRequest_1 = require("../middleware/validateRequest");
const schemas_1 = require("../validation/schemas");
const router = express_1.default.Router();
const authRateLimitResponse = {
    success: false,
    message: "Too many attempts. Please try again later.",
};
const loginRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: authRateLimitResponse,
});
const registerRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: authRateLimitResponse,
});
// Authentication Routes
router.post("/register", registerRateLimiter, (0, validateRequest_1.validateRequest)({ body: schemas_1.registerBodySchema }), authController_1.registerUser);
router.post("/login", loginRateLimiter, (0, validateRequest_1.validateRequest)({ body: schemas_1.loginBodySchema }), authController_1.loginUser);
router.get("/me", authMiddleware_1.authenticateToken, authController_1.getCurrentUser);
exports.default = router;
