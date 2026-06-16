import { describe, it, expect } from 'vitest';
import { astar } from '../astar.js';
import { dijkstra } from '../dijkstra.js';
import type { Graph, EvacTarget } from '../types.js';

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

const TARGETS: EvacTarget[] = [
  { nodeId: 3, lat: 14.652, lng: 121.100, name: 'Evac Center A' },
];

describe('astar', () => {
  const graph = buildGraph();

  it('produces the same path as dijkstra', () => {
    const astarR = astar(graph, 1, TARGETS);
    const dijkR = dijkstra(graph, 1, new Set([3]));
    expect(astarR.reachable).toBe(true);
    expect(astarR.nodeIds).toEqual(dijkR.nodeIds);
    expect(astarR.segmentIds).toEqual(dijkR.segmentIds);
    expect(astarR.totalLengthM).toBe(dijkR.totalLengthM);
  });

  it('returns reachable=false when only path is flooded', () => {
    const isolated: Graph = new Map([
      [5, {
        node: { id: 5, lat: 14.660, lng: 121.110 },
        edges: [{ segmentId: 99, toNodeId: 6, lengthM: 10, baseWeight: 10, floodDepthM: 0.9, passable: true }],
      }],
      [6, { node: { id: 6, lat: 14.661, lng: 121.110 }, edges: [] }],
    ]);
    const r = astar(isolated, 5, [{ nodeId: 6, lat: 14.661, lng: 121.110, name: 'X' }]);
    expect(r.reachable).toBe(false);
  });

  it('handles multiple targets and picks the nearest reachable one', () => {
    const multiTargets: EvacTarget[] = [
      { nodeId: 3, lat: 14.652, lng: 121.100, name: 'Far center' },
      { nodeId: 4, lat: 14.651, lng: 121.101, name: 'Near center' },
    ];
    const r = astar(graph, 1, multiTargets);
    expect(r.reachable).toBe(true);
    // Node 4 is one hop; node 3 via safe path is two hops
    expect(r.nodeIds[r.nodeIds.length - 1]).toBe(4);
  });

  it('returns trivially when source is already a target', () => {
    const r = astar(graph, 3, TARGETS);
    expect(r.reachable).toBe(true);
    expect(r.totalCost).toBe(0);
    expect(r.segmentIds).toHaveLength(0);
  });
});
