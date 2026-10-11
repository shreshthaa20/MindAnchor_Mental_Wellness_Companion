"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const formatValidationMessage = (error) => {
    const issue = error.issues[0];
    const field = issue.path.join(".");
    if (!field) {
        return issue.message;
    }
    return `${field}: ${issue.message}`;
};
const validateRequest = (schemas) => (req, res, next) => {
    try {
        if (schemas.body) {
            req.body = schemas.body.parse(req.body);
        }
        if (schemas.query) {
            req.query = schemas.query.parse(req.query);
        }
        if (schemas.params) {
            req.params = schemas.params.parse(req.params);
        }
        next();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                message: formatValidationMessage(error),
            });
        }
        next(error);
    }
};
exports.validateRequest = validateRequest;
