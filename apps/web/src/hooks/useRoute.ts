import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/index.ts';

export function useRoute() {
  const position = useAppStore((s) => s.position);
  const rerouteAt = useAppStore((s) => s.rerouteAt);
  const isOffline = useAppStore((s) => s.isOffline);
  const setRouteResult = useAppStore((s) => s.setRouteResult);
  const setRouteLoading = useAppStore((s) => s.setRouteLoading);
  const addAlert = useAppStore((s) => s.addAlert);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Round to 4 d.p. (~11 m) to suppress GPS jitter
  const latR = position ? +position.lat.toFixed(4) : null;
  const lngR = position ? +position.lng.toFixed(4) : null;

  useEffect(() => {
    if (latR === null || lngR === null) return;

    if (isOffline) {
      // Cached routeResult (persisted by Zustand) stays visible; don't spin.
      setRouteLoading(false);
      return;
    }

    setRouteLoading(true);
    clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/route?lat=${latR}&lng=${lngR}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRouteResult(data);
        if (!data.reachable) {
          addAlert(
            data.message ?? 'No safe route found — all paths may be blocked.',
            'danger',
          );
        }
      } catch {
        addAlert('Could not reach routing server.', 'warning');
        setRouteLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer.current);
  }, [latR, lngR, rerouteAt, isOffline]); // eslint-disable-line react-hooks/exhaustive-deps
}
