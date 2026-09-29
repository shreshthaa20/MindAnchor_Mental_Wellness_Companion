"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    // Protected routes expect this header:
    // Authorization: Bearer <jwt token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided.",
        });
    }
    const token = authHeader.split(" ")[1];
    try {
        // jwt.verify checks that the token was signed by our backend
        // and has not expired. The decoded payload contains the user id/email.
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Store the logged-in user on the request so controllers/services can use it.
        req.user = decoded;
        // next() means "authentication passed, continue to the actual route handler."
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};
exports.authenticateToken = authenticateToken;
