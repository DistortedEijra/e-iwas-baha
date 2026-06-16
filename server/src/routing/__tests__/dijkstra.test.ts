import { describe, it, expect } from 'vitest';
import { dijkstra } from '../dijkstra.js';
import type { Graph } from '../types.js';

/**
 * Test graph (directed):
 *
 *   1 --(seg10, 100m, dry)---> 2 --(seg12, 100m, flood@0.6m)---> 3
 *   1 --(seg11, 150m, dry)---> 4 --(seg13,  80m, dry)-----------> 3
 *
 * Naïve shortest: 1→2→3 (200m).
 * Flood-safe:     1→4→3 (230m) — seg12 is impassable (depth ≥ 0.5m).
 */
function buildGraph(): Graph {
  const g: Graph = new Map();
  g.set(1, {
    node: { id: 1, lat: 14.650, lng: 121.100 },
    edges: [
      { segmentId: 10, toNodeId: 2, lengthM: 100, baseWeight: 100, floodDepthM: 0, passable: true },
      { segmentId: 11, toNodeId: 4, lengthM: 150, baseWeight: 150, floodDepthM: 0, passable: true },
    ],
  });
  g.set(2, {
    node: { id: 2, lat: 14.651, lng: 121.100 },
    edges: [
      { segmentId: 12, toNodeId: 3, lengthM: 100, baseWeight: 100, floodDepthM: 0.6, passable: true },
    ],
  });
  g.set(3, { node: { id: 3, lat: 14.652, lng: 121.100 }, edges: [] });
  g.set(4, {
    node: { id: 4, lat: 14.651, lng: 121.101 },
    edges: [
      { segmentId: 13, toNodeId: 3, lengthM: 80, baseWeight: 80, floodDepthM: 0, passable: true },
    ],
  });
  return g;
}

describe('dijkstra', () => {
  const graph = buildGraph();

  it('routes around a flooded segment', () => {
    const r = dijkstra(graph, 1, new Set([3]));
    expect(r.reachable).toBe(true);
    expect(r.nodeIds).toEqual([1, 4, 3]);
    expect(r.segmentIds).toEqual([11, 13]);
    expect(r.totalLengthM).toBe(230);
  });

  it('returns reachable=false when every path is blocked', () => {
    const blocked: Graph = new Map([
      [1, {
        node: { id: 1, lat: 0, lng: 0 },
        edges: [{ segmentId: 99, toNodeId: 2, lengthM: 10, baseWeight: 10, floodDepthM: 0.9, passable: true }],
      }],
      [2, { node: { id: 2, lat: 0, lng: 0 }, edges: [] }],
    ]);
    expect(dijkstra(blocked, 1, new Set([2])).reachable).toBe(false);
  });

  it('returns trivially when source is a target', () => {
    const r = dijkstra(graph, 3, new Set([3]));
    expect(r.reachable).toBe(true);
    expect(r.nodeIds).toEqual([3]);
    expect(r.totalCost).toBe(0);
    expect(r.segmentIds).toHaveLength(0);
  });

  it('stops at the nearest of multiple targets', () => {
    // Both 3 and 4 are targets; 4 is one hop, 3 is two hops
    const r = dijkstra(graph, 1, new Set([3, 4]));
    expect(r.reachable).toBe(true);
    expect(r.nodeIds[r.nodeIds.length - 1]).toBe(4);
  });
});
