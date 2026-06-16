import { Router } from 'express';
import type { Pool } from 'pg';
import { requireAdmin } from '../middleware/adminAuth.js';

export function uatRouter(pool: Pool) {
  const router = Router();

  /** POST /api/uat — submit a UAT evaluation (public, no auth required) */
  router.post('/', async (req, res) => {
    const { usability, route_clarity, alert_usefulness, would_use, comments } =
      req.body as Record<string, unknown>;

    const isRating = (v: unknown): v is number =>
      typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;

    if (!isRating(usability) || !isRating(route_clarity) || !isRating(alert_usefulness)) {
      return res.status(400).json({ error: 'usability, route_clarity, and alert_usefulness must be integers 1–5' });
    }

    await pool.query(
      `INSERT INTO uat_responses (usability, route_clarity, alert_usefulness, would_use, comments)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        usability,
        route_clarity,
        alert_usefulness,
        typeof would_use === 'boolean' ? would_use : null,
        typeof comments === 'string' ? comments.slice(0, 2000) : null,
      ],
    );

    return res.json({ ok: true });
  });

  /** GET /api/uat/summary — aggregate results (admin only) */
  router.get('/summary', requireAdmin, async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        ROUND(AVG(usability)::numeric, 2)                AS avg_usability,
        ROUND(AVG(route_clarity)::numeric, 2)            AS avg_route_clarity,
        ROUND(AVG(alert_usefulness)::numeric, 2)         AS avg_alert_usefulness,
        COUNT(*) FILTER (WHERE would_use = true)         AS would_use_yes,
        COUNT(*) FILTER (WHERE would_use = false)        AS would_use_no
      FROM uat_responses
    `);
    return res.json(rows[0]);
  });

  /** GET /api/uat/responses — raw responses paginated (admin only) */
  router.get('/responses', requireAdmin, async (req, res) => {
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '50'), 10), 200);
    const offset = parseInt(String(req.query['offset'] ?? '0'), 10);
    const { rows } = await pool.query(
      `SELECT * FROM uat_responses ORDER BY submitted_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return res.json(rows);
  });

  return router;
}
