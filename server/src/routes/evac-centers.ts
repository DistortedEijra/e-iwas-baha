import { Router } from 'express';
import type { Pool } from 'pg';

export function evacCentersRouter(pool: Pool) {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const { rows } = await pool.query<{
        id: number;
        name: string;
        address: string | null;
        capacity: number | null;
        active: boolean;
        lat: string;
        lng: string;
      }>(
        `SELECT id, name, address, capacity, active,
                ST_Y(geom) AS lat, ST_X(geom) AS lng
         FROM evac_centers
         ORDER BY name`,
      );
      res.json(rows.map((r) => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load evacuation centers' });
    }
  });

  return router;
}
