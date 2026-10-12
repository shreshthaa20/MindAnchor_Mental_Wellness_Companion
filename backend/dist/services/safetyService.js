"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSafetyEvent = exports.assessSafetyRisk = void 0;
const database_1 = require("../config/database");
const possibleRiskPatterns = [
    /\bsuicid(e|al)\b/i,
    /\bself[-\s]?harm\b/i,
    /\bhurt myself\b/i,
    /\bkill(?:ing)? myself\b/i,
    /\bi want to die\b/i,
    /\bend my life\b/i,
    /\bi do not want to live\b/i,
    /\bi don'?t want to (?:live|be alive)\b/i,
    /\bi wish i (?:was|were) dead\b/i,
    /\bcan't go on\b/i,
    /\bno reason to live\b/i,
    /\bhopeless\b/i,
    /\bharm others\b/i,
    /\bhurt someone\b/i,
];
const imminentRiskPatterns = [
    /\bi(?: am|'m) going to kill myself\b/i,
    /\bi will kill myself\b/i,
    /\bi have a plan\b(?=[^.!?\n]{0,100}\b(?:to (?:kill myself|end my life|hurt myself)|for (?:suicide|self[-\s]?harm))\b)/i,
    /\btonight is the night\b(?=[^.!?\n]{0,100}\b(?:to (?:kill myself|end my life|hurt myself)|i (?:will|am going to|'m going to) (?:kill myself|end my life|hurt myself)|suicide|self[-\s]?harm)\b)/i,
    /\bgoodbye forever\b/i,
];
const normalizeSafetyText = (message) => message.replace(/[\u2018\u2019\u02bc\uff07]/g, "'");
const assessSafetyRisk = (message) => {
    const normalizedMessage = normalizeSafetyText(message);
    const hasImminentRisk = imminentRiskPatterns.some((pattern) => pattern.test(normalizedMessage));
    if (hasImminentRisk) {
        return {
            hasCrisisRisk: true,
            riskLevel: "imminent",
            response: "I'm really sorry you're feeling this much pain. Your safety matters right now. Please contact local emergency services immediately, contact local crisis support, or reach out to a trusted person who can stay with you. If you can, move away from anything you could use to hurt yourself or someone else while you get help. MindAnchor is a support tool, not a replacement for emergency or professional care.",
        };
    }
    const hasPossibleRisk = possibleRiskPatterns.some((pattern) => pattern.test(normalizedMessage));
    if (hasPossibleRisk) {
        return {
            hasCrisisRisk: true,
            riskLevel: "possible",
            response: "I'm really sorry you're carrying this. You do not have to handle it alone. If you might hurt yourself, hurt someone else, or feel unable to stay safe, please contact local emergency services now, contact local crisis support, or reach out to a trusted person nearby. MindAnchor can support you, but it is not a replacement for crisis or professional care.",
        };
    }
    return {
        hasCrisisRisk: false,
        riskLevel: "none",
    };
};
exports.assessSafetyRisk = assessSafetyRisk;
const logSafetyEvent = async ({ userId, eventType, riskLevel, source, message, }) => {
    await database_1.pool.query(`
    INSERT INTO safety_events
      (user_id, event_type, risk_level, source, message_preview)
    VALUES ($1, $2, $3, $4, $5)
    `, [
        userId ?? null,
        eventType,
        riskLevel,
        source,
        message.slice(0, 500),
    ]);
};
exports.logSafetyEvent = logSafetyEvent;
