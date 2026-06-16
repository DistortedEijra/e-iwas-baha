import type { EvacTarget, Graph, RouteResult } from './types.js';
import { edgeCost } from './costFn.js';
import { MinHeap } from './heap.js';
import { haversineM } from './haversine.js';

interface Prev {
  from: number;
  segId: number;
  lenM: number;
}

function reconstructPath(
  target: number,
  source: number,
  prev: Map<number, Prev>,
  g: Map<number, number>,
): RouteResult {
  const nodeIds: number[] = [];
  const segmentIds: number[] = [];
  let totalLengthM = 0;
  let cur = target;
  while (cur !== source) {
    const p = prev.get(cur)!;
    nodeIds.unshift(cur);
    segmentIds.unshift(p.segId);
    totalLengthM += p.lenM;
    cur = p.from;
  }
  nodeIds.unshift(source);
  return {
    reachable: true,
    nodeIds,
    segmentIds,
    totalCost: g.get(target)!,
    totalLengthM,
  };
}

/**
 * A* to the nearest reachable evacuation center.
 *
 * Heuristic: minimum haversine distance to any target.
 * Admissibility: edgeCost >= lengthM >= straight-line distance, so h never
 * overestimates and the first target popped is guaranteed optimal.
 */
export function astar(
  graph: Graph,
  sourceId: number,
  targets: EvacTarget[],
): RouteResult {
  const targetSet = new Set(targets.map((t) => t.nodeId));

  if (targetSet.has(sourceId)) {
    return {
      reachable: true,
      nodeIds: [sourceId],
      segmentIds: [],
      totalCost: 0,
      totalLengthM: 0,
    };
  }

  function h(nodeId: number): number {
    const node = graph.get(nodeId)?.node;
    if (!node) return 0;
    let min = Infinity;
    for (const t of targets) {
      const d = haversineM(node.lat, node.lng, t.lat, t.lng);
      if (d < min) min = d;
    }
    return min;
  }

  const g = new Map<number, number>([[sourceId, 0]]);
  const prev = new Map<number, Prev>();
  const heap = new MinHeap();
  heap.push({ priority: h(sourceId), id: sourceId });

  while (heap.size > 0) {
    const { id: u } = heap.pop()!;
    const gu = g.get(u) ?? Infinity;

    if (targetSet.has(u)) {
      return reconstructPath(u, sourceId, prev, g);
    }

    for (const edge of graph.get(u)?.edges ?? []) {
      const cost = edgeCost(edge);
      if (!isFinite(cost)) continue;
      const ng = gu + cost;
      if (ng < (g.get(edge.toNodeId) ?? Infinity)) {
        g.set(edge.toNodeId, ng);
        prev.set(edge.toNodeId, { from: u, segId: edge.segmentId, lenM: edge.lengthM });
        heap.push({ priority: ng + h(edge.toNodeId), id: edge.toNodeId });
      }
    }
  }

  return { reachable: false, nodeIds: [], segmentIds: [], totalCost: Infinity, totalLengthM: 0 };
}
