import { NextFunction, Request, Response } from "express";
import { z, ZodError, ZodType } from "zod";

type RequestSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

const formatValidationMessage = (error: ZodError): string => {
  const issue = error.issues[0];
  const field = issue.path.join(".");

  if (!field) {
    return issue.message;
  }

  return `${field}: ${issue.message}`;
};

export const validateRequest = (schemas: RequestSchemas) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query) as Request["query"];
    }

    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as Request["params"];
    }

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: formatValidationMessage(error),
      });
    }

    next(error);
  }
};
