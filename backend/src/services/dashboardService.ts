import { pool } from "../config/database";
import { AppError } from "../utils/AppError";
import { moodScores, normalizeMoodLabel } from "../utils/moodCatalog";

interface CountRow {
  count: string;
}

interface LatestMoodRow {
  mood: string;
  created_at: Date;
}

interface MoodDistributionRow {
  mood: string;
  count: string;
}

interface MoodTrendRow {
  day: string;
  mood: string;
  count: string;
}

interface DailyMoodRow {
  day: string;
}

export interface DashboardAnalytics {
  totalMoods: number;
  totalJournals: number;
  latestMood: LatestMoodRow | null;
  moodDistribution: Array<{
    mood: string;
    count: number;
  }>;
  moodTrends: Array<{
    day: string;
    mood: string;
    count: number;
  }>;
  weeklySummary: {
    startDate: string;
    endDate: string;
    moodCount: number;
    journalCount: number;
    topMood: string | null;
  };
  insights: {
    moodStreakDays: number;
    mostCommonMood: string | null;
    journalEntriesThisWeek: number;
    moodEntriesThisWeek: number;
    trendDirection: "improving" | "declining" | "steady" | "not_enough_data";
  };
}

export const getDashboardAnalyticsForUser = async (
  userId: number | undefined
): Promise<DashboardAnalytics> => {
  if (!userId) {
    throw new AppError("Unauthorized.", 401);
  }

  const [
    moodCountResult,
    journalCountResult,
    latestMoodResult,
    distributionResult,
    trendsResult,
    weeklyMoodCountResult,
    weeklyJournalCountResult,
    weeklyTopMoodResult,
    moodStreakResult,
  ] = await Promise.all([
    pool.query<CountRow>(
      "SELECT COUNT(*) AS count FROM moods WHERE user_id = $1",
      [userId]
    ),
    pool.query<CountRow>(
      "SELECT COUNT(*) AS count FROM journals WHERE user_id = $1",
      [userId]
    ),
    pool.query<LatestMoodRow>(
      `
      SELECT mood, created_at
      FROM moods
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    ),
    pool.query<MoodDistributionRow>(
      `
      SELECT mood, COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
      GROUP BY mood
      ORDER BY count DESC, mood ASC
      `,
      [userId]
    ),
    pool.query<MoodTrendRow>(
      `
      SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
             mood,
             COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      GROUP BY created_at::date, mood
      ORDER BY day ASC, mood ASC
      `,
      [userId]
    ),
    pool.query<CountRow>(
      `
      SELECT COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      `,
      [userId]
    ),
    pool.query<CountRow>(
      `
      SELECT COUNT(*) AS count
      FROM journals
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      `,
      [userId]
    ),
    pool.query<MoodDistributionRow>(
      `
      SELECT mood, COUNT(*) AS count
      FROM moods
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '6 days'
      GROUP BY mood
      ORDER BY count DESC, mood ASC
      LIMIT 1
      `,
      [userId]
    ),
    pool.query<DailyMoodRow>(
      `
      SELECT DISTINCT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day
      FROM moods
      WHERE user_id = $1
      ORDER BY day DESC
      LIMIT 30
      `,
      [userId]
    ),
  ]);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);

  const trendScoresByDay = new Map<string, number[]>();
  trendsResult.rows.forEach((row) => {
    const normalizedMood = normalizeMoodLabel(row.mood);
    const score = normalizedMood ? moodScores[normalizedMood] : 3;
    const values = trendScoresByDay.get(row.day) ?? [];
    values.push(score);
    trendScoresByDay.set(row.day, values);
  });
  const dailyScores = Array.from(trendScoresByDay.entries()).map(
    ([day, scores]) => ({
      day,
      score:
        scores.reduce((total, score) => total + score, 0) /
        scores.length,
    })
  );
  const firstScore = dailyScores[0]?.score;
  const lastScore = dailyScores[dailyScores.length - 1]?.score;
  const trendDirection =
    firstScore === undefined || lastScore === undefined
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
  const weeklyJournalCount = Number(
    weeklyJournalCountResult.rows[0]?.count ?? 0
  );

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
