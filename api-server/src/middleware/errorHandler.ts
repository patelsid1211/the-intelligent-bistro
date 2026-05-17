/**
 * api-server/src/middleware/errorHandler.ts
 * Global async error boundary for Express routes.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Wraps an async route handler and forwards thrown errors to next(). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Final error handler — must be registered last in the Express app. */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV !== "production";
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred.";

  console.error("[ERROR]", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message,
      ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}
