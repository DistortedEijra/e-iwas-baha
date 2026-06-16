export interface RoadNode {
  id: number;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  segmentId: number;
  toNodeId: number;
  lengthM: number;
  baseWeight: number;
  floodDepthM: number;
  passable: boolean;
}

export interface GraphEntry {
  node: RoadNode;
  edges: RoadEdge[];
}

/** Adjacency list: nodeId → { node metadata, outgoing edges } */
export type Graph = Map<number, GraphEntry>;

export interface EvacTarget {
  nodeId: number;
  lat: number;
  lng: number;
  name: string;
}

export interface RouteResult {
  reachable: boolean;
  nodeIds: number[];
  segmentIds: number[];
  totalCost: number;
  totalLengthM: number;
}
