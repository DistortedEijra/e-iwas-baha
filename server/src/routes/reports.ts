import { Router } from 'express';
import type { Pool } from 'pg';
import type { Server } from 'socket.io';
import type { Graph } from '../routing/types.js';
import { updateSegmentDepth } from '../routing/graph.js';
import { IMPASSABLE_THRESHOLD_M } from '../routing/costFn.js';

export function reportsRouter(pool: Pool, graph: Graph, io: Server) {
  const router = Router();

  /**
   * POST /api/reports
   * Body: { segment_id: number, flood_depth_m: number }
   *
   * Records a crowd/sensor flood report, updates the road segment in the DB,
   * mutates the live graph, and broadcasts a WebSocket event for re-routing.
   */
  router.post('/', async (req, res) => {
    const { segment_id, flood_depth_m } = req.body as {
      segment_id: unknown;
      flood_depth_m: unknown;
    };

    if (typeof segment_id !== 'number' || typeof flood_depth_m !== 'number') {
      return res.status(400).json({ error: 'segment_id (number) and flood_depth_m (number) required' });
    }
    if (flood_depth_m < 0) {
      return res.status(400).json({ error: 'flood_depth_m must be non-negative' });
    }

    await pool.query(
      `INSERT INTO road_reports (segment_id, flood_depth_m) VALUES ($1, $2)`,
      [segment_id, flood_depth_m],
    );

    const passable = flood_depth_m < IMPASSABLE_THRESHOLD_M;
    await pool.query(
      `UPDATE road_segments
       SET flood_depth_m = $1, passable = $2, updated_at = now()
       WHERE id = $3`,
      [flood_depth_m, passable, segment_id],
    );

    updateSegmentDepth(graph, segment_id, flood_depth_m, passable);

    io.emit('segment:updated', { segmentId: segment_id, floodDepthM: flood_depth_m, passable });

    return res.json({ ok: true, segmentId: segment_id, passable });
  });

  /**
   * GET /api/reports?segment_id=<id>
   * Returns the 20 most recent reports for a segment.
   */
  router.get('/', async (req, res) => {
    const segId = parseInt(req.query['segment_id'] as string, 10);
    if (isNaN(segId)) {
      return res.status(400).json({ error: 'segment_id query param required' });
    }
    const { rows } = await pool.query(
      `SELECT id, flood_depth_m, source, reported_at
       FROM road_reports WHERE segment_id = $1
       ORDER BY reported_at DESC LIMIT 20`,
      [segId],
    );
    return res.json(rows);
  });

  return router;
}
