"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardAnalyticsForUser = void 0;
const database_1 = require("../config/database");
const AppError_1 = require("../utils/AppError");
const moodCatalog_1 = require("../utils/moodCatalog");
const getDashboardAnalyticsForUser = async (userId) => {
    if (!userId) {
        throw new AppError_1.AppError("Unauthorized.", 401);
    }
    const [moodCountResult, journalCountResult, latestMoodResult, distributionResult, trendsResult, weeklyMoodCountResult, weeklyJournalCountResult, weeklyTopMoodResult, moodStreakResult,] = await Promise.all([
        database_1.pool.query("SELECT COUNT(*) AS count FROM moods WHERE user_id = $1", [userId]),
        database_1.pool.query("SELECT COUNT(*) AS count FROM journals WHERE user_id = $1", [userId]),
        database_1.pool.query(`
      SELECT mood, created_at
      FROM moods
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `, [userId]),
        database_1.pool.query(`
      SELECT mood, COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
      GROUP BY mood
      ORDER BY count DESC, mood ASC
      `, [userId]),
        database_1.pool.query(`
      SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
             mood,
             COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      GROUP BY created_at::date, mood
      ORDER BY day ASC, mood ASC
      `, [userId]),
        database_1.pool.query(`
      SELECT COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      `, [userId]),
        database_1.pool.query(`
      SELECT COUNT(*) AS count
      FROM journals
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      `, [userId]),
        database_1.pool.query(`
      SELECT mood, COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      GROUP BY mood
      ORDER BY count DESC, mood ASC
      LIMIT 1
      `, [userId]),
        database_1.pool.query(`
      SELECT DISTINCT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day
      FROM moods
      WHERE user_id = $1
      ORDER BY day DESC
      LIMIT 30
      `, [userId]),
    ]);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    const trendScoresByDay = new Map();
    trendsResult.rows.forEach((row) => {
        const normalizedMood = (0, moodCatalog_1.normalizeMoodLabel)(row.mood);
        const score = normalizedMood ? moodCatalog_1.moodScores[normalizedMood] : 3;
        const values = trendScoresByDay.get(row.day) ?? [];
        values.push(score);
        trendScoresByDay.set(row.day, values);
    });
    const dailyScores = Array.from(trendScoresByDay.entries()).map(([day, scores]) => ({
        day,
        score: scores.reduce((total, score) => total + score, 0) /
            scores.length,
    }));
    const firstScore = dailyScores[0]?.score;
    const lastScore = dailyScores[dailyScores.length - 1]?.score;
    const trendDirection = firstScore === undefined || lastScore === undefined
        ? "not_enough_data"
        : lastScore > firstScore + 0.25
            ? "improving"
            : lastScore < firstScore - 0.25
                ? "declining"
                : "steady";
    let moodStreakDays = 0;
    const streakDays = new Set(moodStreakResult.rows.map((row) => row.day));
    const cursor = new Date();
    for (let index = 0; index < 30; index += 1) {
        const day = cursor.toISOString().slice(0, 10);
        if (!streakDays.has(day)) {
            break;
        }
        moodStreakDays += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    const mostCommonMood = distributionResult.rows[0]?.mood ?? null;
    const weeklyMoodCount = Number(weeklyMoodCountResult.rows[0]?.count ?? 0);
    const weeklyJournalCount = Number(weeklyJournalCountResult.rows[0]?.count ?? 0);
    return {
        totalMoods: Number(moodCountResult.rows[0]?.count ?? 0),
        totalJournals: Number(journalCountResult.rows[0]?.count ?? 0),
        latestMood: latestMoodResult.rows[0] ?? null,
        moodDistribution: distributionResult.rows.map((row) => ({
            mood: row.mood,
            count: Number(row.count),
        })),
        moodTrends: trendsResult.rows.map((row) => ({
            day: row.day,
            mood: row.mood,
            count: Number(row.count),
        })),
        weeklySummary: {
            startDate: startDate.toISOString().slice(0, 10),
            endDate: today.toISOString().slice(0, 10),
            moodCount: weeklyMoodCount,
            journalCount: weeklyJournalCount,
            topMood: weeklyTopMoodResult.rows[0]?.mood ?? null,
        },
        insights: {
            moodStreakDays,
            mostCommonMood,
            journalEntriesThisWeek: weeklyJournalCount,
            moodEntriesThisWeek: weeklyMoodCount,
            trendDirection,
        },
    };
};
exports.getDashboardAnalyticsForUser = getDashboardAnalyticsForUser;
