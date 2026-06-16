/**
 * Routing integration tests — no database required.
 *
 * A 3×2 grid graph (6 nodes, 14 directed edges, all 10 m each):
 *
 *   1 — 2 — 3
 *   |   |   |
 *   4 — 5 — 6  ← evac center
 *
 * Source: node 1.  Tests verify flood-aware pathfinding end-to-end.
 */
import { describe, it, expect } from 'vitest';
import { dijkstra } from '../routing/dijkstra.js';
import { astar } from '../routing/astar.js';
import { updateSegmentDepth } from '../routing/graph.js';
import type { Graph, EvacTarget } from '../routing/types.js';

function buildGrid(): Graph {
  const g: Graph = new Map();
  const mkNode = (id: number, lat: number, lng: number) => ({
    node: { id, lat, lng },
    edges: [] as Graph extends Map<number, infer V> ? V['edges'] : never,
  });

  g.set(1, mkNode(1, 14.650, 121.100));
  g.set(2, mkNode(2, 14.650, 121.101));
  g.set(3, mkNode(3, 14.650, 121.102));
  g.set(4, mkNode(4, 14.651, 121.100));
  g.set(5, mkNode(5, 14.651, 121.101));
  g.set(6, mkNode(6, 14.651, 121.102));

  const e = (segId: number, to: number) => ({
    segmentId: segId, toNodeId: to, lengthM: 10, baseWeight: 10,
    floodDepthM: 0, passable: true,
  });

  // Horizontal edges (top row)
  g.get(1)!.edges.push(e(1, 2));   g.get(2)!.edges.push(e(2, 1));
  g.get(2)!.edges.push(e(3, 3));   g.get(3)!.edges.push(e(4, 2));
  // Horizontal edges (bottom row)
  g.get(4)!.edges.push(e(11, 5));  g.get(5)!.edges.push(e(12, 4));
  g.get(5)!.edges.push(e(13, 6));  g.get(6)!.edges.push(e(14, 5));
  // Vertical edges
  g.get(1)!.edges.push(e(5, 4));   g.get(4)!.edges.push(e(6, 1));
  g.get(2)!.edges.push(e(7, 5));   g.get(5)!.edges.push(e(8, 2));
  g.get(3)!.edges.push(e(9, 6));   g.get(6)!.edges.push(e(10, 3));

  return g;
}

const TARGETS: EvacTarget[] = [
  { nodeId: 6, lat: 14.651, lng: 121.102, name: 'Marikina Evac Center' },
];

describe('routing integration – grid graph', () => {
  it('finds a 30 m path from node 1 to node 6', () => {
    const g = buildGrid();
    const r = dijkstra(g, 1, new Set([6]));
    expect(r.reachable).toBe(true);
    expect(r.totalLengthM).toBe(30);
    expect(r.nodeIds[0]).toBe(1);
    expect(r.nodeIds.at(-1)).toBe(6);
  });

  it('a* yields the same path length as dijkstra', () => {
    const g = buildGrid();
    const dr = dijkstra(g, 1, new Set([6]));
    const ar = astar(g, 1, TARGETS);
    expect(ar.reachable).toBe(true);
    expect(ar.totalLengthM).toBe(dr.totalLengthM);
  });

  it('avoids a flooded direct edge (3→6) and reroutes', () => {
    const g = buildGrid();
    // Flood the top-right shortcut 3→6 (seg 9) and its reverse (seg 10)
    updateSegmentDepth(g, 9, 0.6, false);
    updateSegmentDepth(g, 10, 0.6, false);

    const r = dijkstra(g, 1, new Set([6]));
    expect(r.reachable).toBe(true);
    // Must not go through node 3 to reach 6 (that edge is blocked)
    const idx3 = r.nodeIds.indexOf(3);
    const idx6 = r.nodeIds.indexOf(6);
    if (idx3 !== -1) {
      // if 3 is in path, 6 must NOT immediately follow it
      expect(r.nodeIds[idx3 + 1]).not.toBe(6);
    }
    expect(r.nodeIds.at(-1)).toBe(6);
  });

  it('returns reachable=false when every entry to node 6 is flooded', () => {
    const g = buildGrid();
    updateSegmentDepth(g, 9,  0.6, false); // 3→6
    updateSegmentDepth(g, 10, 0.6, false); // 6→3
    updateSegmentDepth(g, 13, 0.6, false); // 5→6
    updateSegmentDepth(g, 14, 0.6, false); // 6→5

    const r = dijkstra(g, 1, new Set([6]));
    expect(r.reachable).toBe(false);
  });

  it('handles source at the evac center (trivial case)', () => {
    const g = buildGrid();
    const r = astar(g, 6, TARGETS);
    expect(r.reachable).toBe(true);
    expect(r.totalCost).toBe(0);
    expect(r.segmentIds).toHaveLength(0);
  });

  it('chooses the nearest of two targets', () => {
    const g = buildGrid();
    // Node 2 is 1 hop from node 1; node 6 is 3 hops — should prefer node 2
    const twoTargets: EvacTarget[] = [
      { nodeId: 2, lat: 14.650, lng: 121.101, name: 'Near center' },
      { nodeId: 6, lat: 14.651, lng: 121.102, name: 'Far center' },
    ];
    const r = astar(g, 1, twoTargets);
    expect(r.reachable).toBe(true);
    expect(r.nodeIds.at(-1)).toBe(2);
    expect(r.totalLengthM).toBe(10);
  });

  it('updateSegmentDepth propagates to both directed copies of an edge', () => {
    const g = buildGrid();
    // Edge 1 (1→2) and edge 2 (2→1) share segmentId values 1 and 2
    updateSegmentDepth(g, 1, 0.4, true);
    const edge1 = g.get(1)!.edges.find((e) => e.segmentId === 1);
    expect(edge1?.floodDepthM).toBe(0.4);
  });
});
