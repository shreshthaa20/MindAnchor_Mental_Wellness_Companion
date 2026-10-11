import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, pool } from "../config/database";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "number" ||
      typeof decoded.email !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const result = await pool.query<{ id: number; email: string }>(
      `
      SELECT id, email
      FROM users
      WHERE id = $1
      `,
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user || user.email !== decoded.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // Store the logged-in user on the request so controllers/services can use it.
    req.user = user;

    // next() means "authentication passed, continue to the actual route handler."
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
