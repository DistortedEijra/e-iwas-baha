import { Router } from 'express';
import type { Pool } from 'pg';
import type { Graph } from '../routing/types.js';
import { nearestNode } from '../routing/graph.js';
import { astar } from '../routing/astar.js';

export function routeRouter(pool: Pool, graph: Graph) {
  const router = Router();

  /**
   * GET /api/route?lat=14.65&lng=121.10
   *
   * Returns a GeoJSON FeatureCollection for the safest route from the
   * user's position to the nearest active evacuation center.
   */
  router.get('/', async (req, res) => {
    const lat = parseFloat(req.query['lat'] as string);
    const lng = parseFloat(req.query['lng'] as string);
    const centerId = req.query['centerId'] ? parseInt(req.query['centerId'] as string, 10) : null;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }

    const sourceId = nearestNode(graph, lat, lng);
    if (sourceId === null) {
      return res.status(503).json({ error: 'Road graph not yet loaded' });
    }

    const { rows: centers } = await pool.query<{
      id: string;
      name: string;
      lat: string;
      lng: string;
    }>(
      centerId
        ? `SELECT id, name, ST_Y(geom) AS lat, ST_X(geom) AS lng
           FROM evac_centers WHERE active = true AND id = $1`
        : `SELECT id, name, ST_Y(geom) AS lat, ST_X(geom) AS lng
           FROM evac_centers WHERE active = true`,
      centerId ? [centerId] : [],
    );

    if (centers.length === 0) {
      return res.status(404).json({ error: 'No active evacuation centers in database' });
    }

    const targets = centers
      .map((c) => ({
        nodeId: nearestNode(graph, Number(c.lat), Number(c.lng)) ?? -1,
        lat: Number(c.lat),
        lng: Number(c.lng),
        name: c.name,
      }))
      .filter((t) => t.nodeId !== -1);

    const result = astar(graph, sourceId, targets);

    if (!result.reachable) {
      return res.json({
        reachable: false,
        message: 'No safe route found — all paths are blocked by floodwater.',
      });
    }

    // Fetch ordered segment geometries for the path
    const { rows: segments } = await pool.query<{
      id: number;
      geom: object;
      length_m: number;
      flood_depth_m: number;
      passable: boolean;
      name: string | null;
      highway: string | null;
    }>(
      `SELECT id, ST_AsGeoJSON(geom)::json AS geom, length_m, flood_depth_m, passable, name, highway
       FROM road_segments WHERE id = ANY($1)`,
      [result.segmentIds],
    );

    const segMap = new Map(segments.map((s) => [s.id, s]));
    const features = result.segmentIds.map((id) => {
      const seg = segMap.get(id);
      return {
        type: 'Feature' as const,
        geometry: seg?.geom ?? null,
        properties: {
          segmentId: id,
          lengthM: seg?.length_m ?? null,
          floodDepthM: seg?.flood_depth_m ?? null,
          passable: seg?.passable ?? null,
          name: seg?.name ?? null,
          highway: seg?.highway ?? null,
        },
      };
    });

    const destNodeId = result.nodeIds[result.nodeIds.length - 1];
    const reached = targets.find((t) => t.nodeId === destNodeId);

    return res.json({
      reachable: true,
      totalLengthM: Math.round(result.totalLengthM),
      totalCost: result.totalCost,
      evacuationCenter: reached?.name ?? null,
      route: { type: 'FeatureCollection', features },
    });
  });

  return router;
}
