export const allowedMoodLabels = [
  "Happy",
  "Calm",
  "Anxious",
  "Sad",
  "Stressed",
] as const;

export type MoodLabel = (typeof allowedMoodLabels)[number];

const moodLabelLookup = new Map<string, MoodLabel>(
  allowedMoodLabels.map((mood) => [mood.toLowerCase(), mood])
);

export const normalizeMoodLabel = (mood: string): MoodLabel | null =>
  moodLabelLookup.get(mood.trim().toLowerCase()) ?? null;

export const moodScores: Record<MoodLabel, number> = {
  Happy: 5,
  Calm: 4,
  Anxious: 2,
  Sad: 1,
  Stressed: 2,
};
