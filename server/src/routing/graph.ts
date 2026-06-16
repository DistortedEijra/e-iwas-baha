import type { Pool } from 'pg';
import type { Graph, RoadEdge } from './types.js';

export async function loadGraph(pool: Pool): Promise<Graph> {
  const graph: Graph = new Map();

  const { rows: nodeRows } = await pool.query<{
    id: string;
    lat: string;
    lng: string;
  }>('SELECT id, lat, lng FROM nodes');

  for (const r of nodeRows) {
    graph.set(Number(r.id), {
      node: { id: Number(r.id), lat: Number(r.lat), lng: Number(r.lng) },
      edges: [],
    });
  }

  const { rows: edgeRows } = await pool.query<{
    id: string;
    from_node_id: string;
    to_node_id: string;
    length_m: string;
    base_weight: string;
    flood_depth_m: string;
    passable: boolean;
  }>(
    `SELECT id, from_node_id, to_node_id, length_m, base_weight, flood_depth_m, passable
     FROM road_segments
     WHERE from_node_id IS NOT NULL AND to_node_id IS NOT NULL`,
  );

  for (const r of edgeRows) {
    const entry = graph.get(Number(r.from_node_id));
    if (!entry) continue;
    entry.edges.push({
      segmentId: Number(r.id),
      toNodeId: Number(r.to_node_id),
      lengthM: Number(r.length_m),
      baseWeight: Number(r.base_weight),
      floodDepthM: Number(r.flood_depth_m),
      passable: r.passable,
    });
  }

  console.log(`Graph loaded: ${graph.size} nodes, ${edgeRows.length} directed edges`);
  return graph;
}

/** Mutate a single segment's flood state in the live in-memory graph. */
export function updateSegmentDepth(
  graph: Graph,
  segmentId: number,
  floodDepthM: number,
  passable: boolean,
): void {
  for (const entry of graph.values()) {
    for (const edge of entry.edges) {
      if (edge.segmentId === segmentId) {
        edge.floodDepthM = floodDepthM;
        edge.passable = passable;
      }
    }
  }
}

/**
 * Snap an arbitrary lat/lng to the nearest node in the graph.
 * Uses squared angular distance — accurate enough for local snapping.
 */
export function nearestNode(graph: Graph, lat: number, lng: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const [id, { node }] of graph) {
    const d = (node.lat - lat) ** 2 + (node.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}
