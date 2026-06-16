import type { RouteFeature } from '../types.ts';

export type StepType = 'depart' | 'turn-left' | 'turn-right' | 'straight' | 'arrive';

export interface DirectionStep {
  type: StepType;
  instruction: string;
  roadLabel: string;
  distanceM: number;
  hasFlood: boolean;
  segmentIndices: number[];
}

// GeoJSON coords are [lng, lat]
function bearing(c1: [number, number], c2: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(c1[1]);
  const φ2 = toRad(c2[1]);
  const Δλ = toRad(c2[0] - c1[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function compassDir(b: number): string {
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return dirs[Math.round(b / 45) % 8];
}

function turnType(inB: number, outB: number): StepType {
  const delta = ((outB - inB + 540) % 360) - 180; // -180..180
  if (delta > 30) return 'turn-right';
  if (delta < -30) return 'turn-left';
  return 'straight';
}

function roadLabel(f: RouteFeature): string {
  return f.properties.name ?? f.properties.highway ?? 'the road';
}

function segBearing(f: RouteFeature): number {
  const c = f.geometry.coordinates;
  return c.length >= 2 ? bearing(c[0], c[1]) : 0;
}

function segLastBearing(f: RouteFeature): number {
  const c = f.geometry.coordinates;
  return c.length >= 2 ? bearing(c[c.length - 2], c[c.length - 1]) : 0;
}

export function buildSteps(features: RouteFeature[], destinationName: string): DirectionStep[] {
  if (features.length === 0) return [];

  // Group consecutive features sharing the same road label
  type Group = { label: string; features: RouteFeature[]; startIdx: number };
  const groups: Group[] = [];

  for (let i = 0; i < features.length; i++) {
    const label = roadLabel(features[i]);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, features: [features[i]], startIdx: i });
    } else {
      last.features.push(features[i]);
    }
  }

  const steps: DirectionStep[] = groups.map((g, gi) => {
    const distanceM = g.features.reduce((s, f) => s + (f.properties.lengthM ?? 0), 0);
    const hasFlood = g.features.some((f) => (f.properties.floodDepthM ?? 0) > 0);
    const segmentIndices = g.features.map((_, fi) => g.startIdx + fi);
    const outBearing = segBearing(g.features[0]);

    let type: StepType;
    let instruction: string;

    if (gi === 0) {
      type = 'depart';
      instruction = `Head ${compassDir(outBearing)} on ${g.label}`;
    } else {
      const prevGroup = groups[gi - 1];
      const inBearing = segLastBearing(prevGroup.features[prevGroup.features.length - 1]);
      type = turnType(inBearing, outBearing);
      const word =
        type === 'turn-left' ? 'Turn left onto' :
        type === 'turn-right' ? 'Turn right onto' :
        'Continue on';
      instruction = `${word} ${g.label}`;
    }

    return { type, instruction, roadLabel: g.label, distanceM, hasFlood, segmentIndices };
  });

  steps.push({
    type: 'arrive',
    instruction: `Arrive at ${destinationName}`,
    roadLabel: '',
    distanceM: 0,
    hasFlood: false,
    segmentIndices: [],
  });

  return steps;
}

export function findCurrentStep(
  steps: DirectionStep[],
  features: RouteFeature[],
  userLat: number,
  userLng: number,
): number {
  if (features.length === 0) return 0;

  let minDist = Infinity;
  let closestIdx = 0;

  features.forEach((f, i) => {
    for (const [lng, lat] of f.geometry.coordinates) {
      const d = (lat - userLat) ** 2 + (lng - userLng) ** 2;
      if (d < minDist) { minDist = d; closestIdx = i; }
    }
  });

  for (let s = 0; s < steps.length; s++) {
    if (steps[s].segmentIndices.includes(closestIdx)) return s;
  }
  return 0;
}

export function computeEtaMin(features: RouteFeature[]): number {
  const CLEAR_MPS = 1.2;  // ~4.3 km/h walk
  const FLOOD_MPS = 0.4;  // ~1.4 km/h through shallow water
  let seconds = 0;
  for (const f of features) {
    const len = f.properties.lengthM ?? 0;
    seconds += len / ((f.properties.floodDepthM ?? 0) > 0 ? FLOOD_MPS : CLEAR_MPS);
  }
  return Math.max(1, Math.ceil(seconds / 60));
}
