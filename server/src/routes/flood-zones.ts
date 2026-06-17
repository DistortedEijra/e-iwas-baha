import { Router } from 'express';
import type { Pool } from 'pg';

export function floodZonesRouter(pool: Pool) {
  const router = Router();

  /** GET /api/flood-zones — all currently flooded segments as GeoJSON (public, no auth) */
  router.get('/', async (_req, res) => {
    const { rows } = await pool.query<{
      id: number;
      geom: object;
      flood_depth_m: number;
      passable: boolean;
      name: string | null;
      highway: string | null;
    }>(`
      SELECT id, ST_AsGeoJSON(geom)::json AS geom,
             flood_depth_m, passable, name, highway
      FROM road_segments
      WHERE flood_depth_m > 0
      ORDER BY flood_depth_m DESC
      LIMIT 500
    `);

    const features = rows.map((r) => ({
      type: 'Feature' as const,
      geometry: r.geom,
      properties: {
        segmentId: r.id,
        floodDepthM: r.flood_depth_m,
        passable: r.passable,
        name: r.name,
        highway: r.highway,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  });

  return router;
}
