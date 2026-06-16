import type { Graph, RouteResult } from './types.js';
import { edgeCost } from './costFn.js';
import { MinHeap } from './heap.js';

interface Prev {
  from: number;
  segId: number;
  lenM: number;
}

function reconstructPath(
  target: number,
  source: number,
  prev: Map<number, Prev>,
  totalCost: number,
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
  return { reachable: true, nodeIds, segmentIds, totalCost, totalLengthM };
}

/**
 * Dijkstra's shortest-path to the nearest reachable target in targetIds.
 * Terminates as soon as the first target is popped from the heap (optimal).
 */
export function dijkstra(
  graph: Graph,
  sourceId: number,
  targetIds: Set<number>,
): RouteResult {
  if (targetIds.has(sourceId)) {
    return {
      reachable: true,
      nodeIds: [sourceId],
      segmentIds: [],
      totalCost: 0,
      totalLengthM: 0,
    };
  }

  const dist = new Map<number, number>([[sourceId, 0]]);
  const prev = new Map<number, Prev>();
  const heap = new MinHeap();
  heap.push({ priority: 0, id: sourceId });

  while (heap.size > 0) {
    const { priority: d, id: u } = heap.pop()!;
    if (d > (dist.get(u) ?? Infinity)) continue; // stale entry

    if (targetIds.has(u)) {
      return reconstructPath(u, sourceId, prev, d);
    }

    for (const edge of graph.get(u)?.edges ?? []) {
      const cost = edgeCost(edge);
      if (!isFinite(cost)) continue;
      const nd = d + cost;
      if (nd < (dist.get(edge.toNodeId) ?? Infinity)) {
        dist.set(edge.toNodeId, nd);
        prev.set(edge.toNodeId, { from: u, segId: edge.segmentId, lenM: edge.lengthM });
        heap.push({ priority: nd, id: edge.toNodeId });
      }
    }
  }

  return { reachable: false, nodeIds: [], segmentIds: [], totalCost: Infinity, totalLengthM: 0 };
}
