import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert, EvacCenter, LatLng, RouteResponse, SegmentUpdate } from '../types.ts';

interface AppState {
  position: LatLng | null;
  positionError: string | null;
  /** When true the user has pinned their position via map click/drag — GPS won't override. */
  isManualPosition: boolean;
  routeResult: RouteResponse | null;
  routeLoading: boolean;
  /** Bump to trigger a route re-fetch without a position change. */
  rerouteAt: number;
  isOffline: boolean;
  isRerouting: boolean;
  alerts: Alert[];
  floodUpdates: Map<number, SegmentUpdate>;
  evacCenters: EvacCenter[];
  /** null = auto-nearest; a number = route only to that center */
  selectedCenterId: number | null;
  floodZones: import('../types.ts').RouteFeature[];

  setPosition: (p: LatLng) => void;
  /** Called by map click/drag — locks out GPS overrides. */
  setManualPosition: (p: LatLng) => void;
  /** Called by the "Use GPS" button — re-enables GPS. */
  clearManualPosition: () => void;
  setPositionError: (e: string) => void;
  setRouteResult: (r: RouteResponse | null) => void;
  setRouteLoading: (l: boolean) => void;
  triggerReroute: () => void;
  setOffline: (v: boolean) => void;
  setRerouting: (v: boolean) => void;
  addAlert: (message: string, type: Alert['type']) => void;
  dismissAlert: (id: string) => void;
  applySegmentUpdate: (update: SegmentUpdate) => void;
  setEvacCenters: (centers: EvacCenter[]) => void;
  setSelectedCenterId: (id: number | null) => void;
  setFloodZones: (zones: import('../types.ts').RouteFeature[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      position: null,
      positionError: null,
      isManualPosition: false,
      routeResult: null,
      routeLoading: false,
      rerouteAt: 0,
      isOffline: false,
      isRerouting: false,
      alerts: [],
      floodUpdates: new Map(),
      evacCenters: [],
      selectedCenterId: null,
      floodZones: [],

      setPosition: (p) => set({ position: p, positionError: null }),
      setManualPosition: (p) => set({ position: p, positionError: null, isManualPosition: true }),
      clearManualPosition: () => set({ isManualPosition: false, position: null }),
      setPositionError: (e) => set({ positionError: e }),
      setRouteResult: (r) => set({ routeResult: r, routeLoading: false, isRerouting: false }),
      setRouteLoading: (l) => set({ routeLoading: l }),
      triggerReroute: () => set({ rerouteAt: Date.now() }),
      setOffline: (v) => set({ isOffline: v }),
      setRerouting: (v) => set({ isRerouting: v }),

      addAlert: (message, type) =>
        set((s) => ({
          alerts: [
            ...s.alerts.slice(-4),
            { id: crypto.randomUUID(), message, type, at: Date.now() },
          ],
        })),
      dismissAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      applySegmentUpdate: (update) =>
        set((s) => {
          const next = new Map(s.floodUpdates);
          next.set(update.segmentId, update);
          return { floodUpdates: next };
        }),

      setEvacCenters: (centers) => set({ evacCenters: centers }),
      setSelectedCenterId: (id) => set({ selectedCenterId: id, rerouteAt: Date.now() }),
      setFloodZones: (zones) => set({ floodZones: zones }),
    }),
    {
      name: 'eiwas-baha',
      // Only persist the last route so the map shows something useful offline
      partialize: (s) => ({ routeResult: s.routeResult }),
    },
  ),
);
