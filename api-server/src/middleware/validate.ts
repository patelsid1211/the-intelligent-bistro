/**
 * api-server/src/middleware/validate.ts
 * Zod-based request body validation middleware factory.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodSchema } from "zod";

/**
 * Returns an Express middleware that validates req.body against the given
 * Zod schema. On failure it responds 400 with structured error details.
 */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body failed validation.",
          details,
        },
      });
      return;
    }
    // Attach parsed + typed body to request
    (req as Request & { parsed: T }).parsed = result.data;
    next();
  };
}
