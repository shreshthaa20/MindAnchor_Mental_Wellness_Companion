"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMoodForUser = exports.updateMoodForUser = exports.getMoodsForUser = exports.createMoodForUser = void 0;
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const normalizeMood = (mood) => {
    // "unknown" means the value came from the outside world.
    // We validate it before trusting it.
    if (typeof mood !== "string" || mood.trim().length === 0) {
        throw new AppError_1.AppError("Mood is required.", 400);
    }
    if (mood.trim().length > 80) {
        throw new AppError_1.AppError("Mood must be 80 characters or fewer.", 400);
    }
    return mood.trim();
};
const createMoodForUser = async (userId, mood) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    // Clean and validate the mood before saving it.
    const normalizedMood = normalizeMood(mood);
    // INSERT creates a new row. RETURNING * gives us the row that was just created.
    const result = await database_1.pool.query(`
    INSERT INTO moods (user_id, mood)
    VALUES ($1, $2)
    RETURNING *
    `, [userId, normalizedMood]);
    return result.rows[0];
};
exports.createMoodForUser = createMoodForUser;
const getMoodsForUser = async (userId) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    // Always filter by user_id so users only see their own data.
    const result = await database_1.pool.query(`
    SELECT *
    FROM moods
    WHERE user_id = $1
    ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
};
exports.getMoodsForUser = getMoodsForUser;
const updateMoodForUser = async (userId, moodId, mood) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    // URL params arrive as strings, so controllers convert id to a number.
    // This check makes sure it is a valid positive integer.
    if (!Number.isInteger(moodId) || moodId <= 0) {
        throw new AppError_1.AppError("Invalid mood id.", 400);
    }
    const normalizedMood = normalizeMood(mood);
    // WHERE id = $2 AND user_id = $3 prevents editing another user's mood.
    const result = await database_1.pool.query(`
    UPDATE moods
    SET mood = $1,
        updated_at = NOW()
    WHERE id = $2 AND user_id = $3
    RETURNING *
    `, [normalizedMood, moodId, userId]);
    if (result.rows.length === 0) {
        // If no row came back, either the mood does not exist or it belongs to another user.
        throw new AppError_1.AppError("Mood not found.", 404);
    }
    return result.rows[0];
};
exports.updateMoodForUser = updateMoodForUser;
const deleteMoodForUser = async (userId, moodId) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    if (!Number.isInteger(moodId) || moodId <= 0) {
        throw new AppError_1.AppError("Invalid mood id.", 400);
    }
    // DELETE removes the row. rowCount tells us how many rows were deleted.
    const result = await database_1.pool.query(`
    DELETE FROM moods
    WHERE id = $1 AND user_id = $2
    `, [moodId, userId]);
    if (result.rowCount === 0) {
        throw new AppError_1.AppError("Mood not found.", 404);
    }
};
exports.deleteMoodForUser = deleteMoodForUser;
