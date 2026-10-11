"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const journalController_1 = require("../controllers/journalController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validateRequest_1 = require("../middleware/validateRequest");
const schemas_1 = require("../validation/schemas");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authenticateToken, (0, validateRequest_1.validateRequest)({ body: schemas_1.journalBodySchema }), journalController_1.createJournal);
router.get("/", authMiddleware_1.authenticateToken, journalController_1.getJournals);
router.get("/:id", authMiddleware_1.authenticateToken, (0, validateRequest_1.validateRequest)({ params: schemas_1.idParamsSchema }), journalController_1.getJournal);
router.put("/:id", authMiddleware_1.authenticateToken, (0, validateRequest_1.validateRequest)({ params: schemas_1.idParamsSchema, body: schemas_1.journalBodySchema }), journalController_1.updateJournal);
router.delete("/:id", authMiddleware_1.authenticateToken, (0, validateRequest_1.validateRequest)({ params: schemas_1.idParamsSchema }), journalController_1.deleteJournal);
exports.default = router;
