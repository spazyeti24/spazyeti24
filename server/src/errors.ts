import type { NextFunction, Request, Response } from 'express';

// Errors thrown with an explicit HTTP status; everything else is a 500.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
  }
}

// Fail loudly: every error is logged server-side and returned to the UI as
// { error, detail } JSON — never swallowed.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : String(err);
  const detail = err instanceof HttpError ? err.detail : err instanceof Error ? err.stack : undefined;
  console.error(`[error] ${status} ${message}${detail ? `\n${detail}` : ''}`);
  res.status(status).json({ error: message, detail });
}

// Express 4 doesn't catch async rejections; wrap handlers so they hit errorHandler.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
