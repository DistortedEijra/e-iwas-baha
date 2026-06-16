import type { Request, Response, NextFunction } from 'express';

/**
 * Blocks requests that don't carry the correct Bearer token.
 * If ADMIN_TOKEN is not set in the environment the middleware is a no-op
 * so the dev server stays open without configuration.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) { next(); return; }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: 'Unauthorized — invalid or missing admin token' });
    return;
  }
  next();
}
