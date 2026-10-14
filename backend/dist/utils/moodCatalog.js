"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moodScores = exports.normalizeMoodLabel = exports.allowedMoodLabels = void 0;
exports.allowedMoodLabels = [
    "Happy",
    "Calm",
    "Anxious",
    "Sad",
    "Stressed",
];
const moodLabelLookup = new Map(exports.allowedMoodLabels.map((mood) => [mood.toLowerCase(), mood]));
const normalizeMoodLabel = (mood) => moodLabelLookup.get(mood.trim().toLowerCase()) ?? null;
exports.normalizeMoodLabel = normalizeMoodLabel;
exports.moodScores = {
    Happy: 5,
    Calm: 4,
    Anxious: 2,
    Sad: 1,
    Stressed: 2,
};
