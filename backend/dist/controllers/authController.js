"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.loginUser = exports.registerUser = void 0;
const database_1 = require("../config/database");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// =========================
// Register User
// =========================
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Never store plain-text passwords.
        // bcrypt turns the password into a one-way hash before saving it.
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // $1, $2, $3 are parameter placeholders.
        // They protect against SQL injection because values are passed separately.
        const result = await database_1.pool.query(`
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
      `, [name, email, hashedPassword]);
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: result.rows[0],
        });
    }
    catch (error) {
        console.error(error);
        // Duplicate email
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email already exists.",
            });
        }
        return res.status(500).json({
            success: false,
            message: "Registration failed",
        });
    }
};
exports.registerUser = registerUser;
// =========================
// Login User
// =========================
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        // First find the user by email.
        const result = await database_1.pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        const user = result.rows[0];
        // Compare the plain password from login with the hashed password in the database.
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        // A JWT is a signed login token.
        // The frontend stores it and sends it with future protected requests.
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
        }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};
exports.loginUser = loginUser;
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        // req.user was added by authenticateToken after it verified the JWT.
        const result = await database_1.pool.query(`
      SELECT id, name, email
      FROM users
      WHERE id = $1
      `, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            user: result.rows[0],
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch current user",
        });
    }
};
exports.getCurrentUser = getCurrentUser;
