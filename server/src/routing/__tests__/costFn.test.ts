import { describe, it, expect } from 'vitest';
import { edgeCost, IMPASSABLE_THRESHOLD_M } from '../costFn.js';
import type { RoadEdge } from '../types.js';

function edge(overrides: Partial<RoadEdge> = {}): RoadEdge {
  return {
    segmentId: 1,
    toNodeId: 2,
    lengthM: 100,
    baseWeight: 100,
    floodDepthM: 0,
    passable: true,
    ...overrides,
  };
}

describe('edgeCost', () => {
  it('returns baseWeight for a dry passable segment', () => {
    expect(edgeCost(edge())).toBe(100);
  });

  it('returns Infinity when passable=false', () => {
    expect(edgeCost(edge({ passable: false }))).toBe(Infinity);
  });

  it('returns Infinity at the threshold depth', () => {
    expect(edgeCost(edge({ floodDepthM: IMPASSABLE_THRESHOLD_M }))).toBe(Infinity);
  });

  it('returns Infinity above the threshold depth', () => {
    expect(edgeCost(edge({ floodDepthM: 0.8 }))).toBe(Infinity);
  });

  it('applies a penalty for shallow water', () => {
    const cost = edgeCost(edge({ floodDepthM: 0.25 }));
    expect(cost).toBeGreaterThan(100);
    expect(cost).toBeLessThan(Infinity);
  });

  it('cost increases monotonically with flood depth', () => {
    const c1 = edgeCost(edge({ floodDepthM: 0.1 }));
    const c2 = edgeCost(edge({ floodDepthM: 0.3 }));
    expect(c2).toBeGreaterThan(c1);
  });

  it('ignores passable flag when depth alone makes it impassable', () => {
    expect(edgeCost(edge({ floodDepthM: 0.6, passable: true }))).toBe(Infinity);
  });
});
