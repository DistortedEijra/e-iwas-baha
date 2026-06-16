export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat] — GeoJSON convention
  };
  properties: {
    segmentId: number;
    lengthM: number | null;
    floodDepthM: number | null;
    passable: boolean | null;
    name: string | null;
    highway: string | null;
  };
}

export interface RouteResponse {
  reachable: boolean;
  totalLengthM?: number;
  totalCost?: number;
  evacuationCenter?: string;
  message?: string;
  route?: {
    type: 'FeatureCollection';
    features: RouteFeature[];
  };
}

export interface EvacCenter {
  id: number;
  name: string;
  address: string | null;
  capacity: number | null;
  lat: number;
  lng: number;
  active: boolean;
}

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  at: number;
}

export interface SegmentUpdate {
  segmentId: number;
  floodDepthM: number;
  passable: boolean;
}
