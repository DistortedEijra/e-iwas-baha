import type { RoadEdge } from './types.js';

export const IMPASSABLE_THRESHOLD_M = 0.5;

// Higher value penalises shallow water more steeply vs distance.
const PENALTY_FACTOR = 10;

/**
 * Returns Infinity for impassable segments; otherwise blends distance
 * with a flood-depth penalty so the router prefers drier roads.
 */
export function edgeCost(edge: RoadEdge): number {
  if (!edge.passable || edge.floodDepthM >= IMPASSABLE_THRESHOLD_M) {
    return Infinity;
  }
  const floodPenalty =
    1 + (edge.floodDepthM / IMPASSABLE_THRESHOLD_M) * PENALTY_FACTOR;
  return edge.baseWeight * floodPenalty;
}
