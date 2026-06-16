import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';

function makeReq(token?: string): Request {
  return {
    headers: { authorization: token ? `Bearer ${token}` : undefined },
  } as unknown as Request;
}

function makeRes(): Response {
  const r = {} as Response;
  r.status = vi.fn().mockReturnValue(r);
  r.json = vi.fn().mockReturnValue(r);
  return r;
}

describe('requireAdmin middleware', () => {
  const savedToken = process.env['ADMIN_TOKEN'];

  afterEach(() => {
    process.env['ADMIN_TOKEN'] = savedToken;
    vi.clearAllMocks();
  });

  it('calls next when ADMIN_TOKEN env var is not set', () => {
    delete process.env['ADMIN_TOKEN'];
    const next = vi.fn() as unknown as NextFunction;
    requireAdmin(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 when no Authorization header is present', () => {
    process.env['ADMIN_TOKEN'] = 'secret';
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAdmin(makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a wrong token', () => {
    process.env['ADMIN_TOKEN'] = 'secret';
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAdmin(makeReq('wrong'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next for the correct token', () => {
    process.env['ADMIN_TOKEN'] = 'secret';
    const next = vi.fn() as unknown as NextFunction;
    requireAdmin(makeReq('secret'), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
