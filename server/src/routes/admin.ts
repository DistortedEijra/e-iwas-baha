import { Router } from 'express';
import type { Pool } from 'pg';
import type { Server } from 'socket.io';
import type { Graph } from '../routing/types.js';
import { updateSegmentDepth } from '../routing/graph.js';
import { IMPASSABLE_THRESHOLD_M } from '../routing/costFn.js';

export function adminRouter(pool: Pool, graph: Graph, io: Server) {
  const router = Router();

  /** GET /api/admin/stats */
  router.get('/stats', async (_req, res) => {
    try {
      const [today, centers, affected] = await Promise.all([
        pool.query<{ n: string }>(
          `SELECT COUNT(*) AS n FROM road_reports WHERE reported_at >= CURRENT_DATE`,
        ),
        pool.query<{ n: string }>(
          `SELECT COUNT(*) AS n FROM evac_centers WHERE active = true`,
        ),
        pool.query<{ n: string }>(
          `SELECT COUNT(*) AS n FROM road_segments WHERE flood_depth_m > 0 OR NOT passable`,
        ),
      ]);
      res.json({
        reports_today: Number(today.rows[0].n),
        active_centers: Number(centers.rows[0].n),
        affected_segments: Number(affected.rows[0].n),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Stats query failed' });
    }
  });

  /** GET /api/admin/segments/active — flooded or blocked segments */
  router.get('/segments/active', async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT id, osm_id, name, highway, length_m, flood_depth_m, passable, updated_at
      FROM road_segments
      WHERE flood_depth_m > 0 OR NOT passable
      ORDER BY updated_at DESC
      LIMIT 200
    `);
    res.json(rows);
  });

  /** POST /api/admin/segments/:id/flood  body: { flood_depth_m } */
  router.post('/segments/:id/flood', async (req, res) => {
    const id = parseInt(req.params['id']!, 10);
    const { flood_depth_m } = req.body as { flood_depth_m: unknown };

    if (typeof flood_depth_m !== 'number' || flood_depth_m < 0) {
      return res.status(400).json({ error: 'flood_depth_m must be a non-negative number' });
    }

    const passable = flood_depth_m < IMPASSABLE_THRESHOLD_M;

    await pool.query(
      `UPDATE road_segments SET flood_depth_m = $1, passable = $2, updated_at = now() WHERE id = $3`,
      [flood_depth_m, passable, id],
    );
    await pool.query(
      `INSERT INTO road_reports (segment_id, flood_depth_m, source) VALUES ($1, $2, 'admin')`,
      [id, flood_depth_m],
    );

    updateSegmentDepth(graph, id, flood_depth_m, passable);
    io.emit('segment:updated', { segmentId: id, floodDepthM: flood_depth_m, passable });

    return res.json({ ok: true, id, flood_depth_m, passable });
  });

  /** POST /api/admin/segments/:id/clear — reset to dry */
  router.post('/segments/:id/clear', async (req, res) => {
    const id = parseInt(req.params['id']!, 10);

    await pool.query(
      `UPDATE road_segments SET flood_depth_m = 0, passable = true, updated_at = now() WHERE id = $1`,
      [id],
    );

    updateSegmentDepth(graph, id, 0, true);
    io.emit('segment:updated', { segmentId: id, floodDepthM: 0, passable: true });

    return res.json({ ok: true, id });
  });

  /** GET /api/admin/evac-centers — all centers, including inactive */
  router.get('/evac-centers', async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT id, name, address, capacity, active,
             ST_Y(geom) AS lat, ST_X(geom) AS lng
      FROM evac_centers ORDER BY name
    `);
    res.json(rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })));
  });

  /** PATCH /api/admin/evac-centers/:id  body: { active?, capacity? } */
  router.patch('/evac-centers/:id', async (req, res) => {
    const id = parseInt(req.params['id']!, 10);
    const { active, capacity } = req.body as { active?: unknown; capacity?: unknown };

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (typeof active === 'boolean') setClauses.push(`active = $${values.push(active)}`);
    if (typeof capacity === 'number') setClauses.push(`capacity = $${values.push(capacity)}`);

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Provide active and/or capacity to update' });
    }

    values.push(id);
    await pool.query(
      `UPDATE evac_centers SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
      values,
    );

    return res.json({ ok: true, id });
  });

  /** GET /api/admin/reports — last 50 road reports with segment metadata */
  router.get('/reports', async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT r.id, r.segment_id, r.flood_depth_m, r.source, r.reported_at,
             s.name AS segment_name, s.highway
      FROM road_reports r
      LEFT JOIN road_segments s ON s.id = r.segment_id
      ORDER BY r.reported_at DESC
      LIMIT 50
    `);
    res.json(rows);
  });

  /** GET /api/admin/uat-summary — UAT aggregate (convenience alias) */
  router.get('/uat-summary', async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                   AS total,
        ROUND(AVG(usability)::numeric, 2)          AS avg_usability,
        ROUND(AVG(route_clarity)::numeric, 2)      AS avg_route_clarity,
        ROUND(AVG(alert_usefulness)::numeric, 2)   AS avg_alert_usefulness,
        COUNT(*) FILTER (WHERE would_use = true)   AS would_use_yes,
        COUNT(*) FILTER (WHERE would_use = false)  AS would_use_no
      FROM uat_responses
    `);
    return res.json(rows[0]);
  });

  return router;
}
