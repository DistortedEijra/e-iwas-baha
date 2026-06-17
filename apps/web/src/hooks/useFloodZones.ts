import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/index.ts';

export function useFloodZones() {
  const setFloodZones = useAppStore((s) => s.setFloodZones);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/flood-zones');
      if (!res.ok) return;
      const data = await res.json();
      setFloodZones(data.features ?? []);
    } catch {
      // non-fatal — flood overlay just won't show
    }
  }, [setFloodZones]);

  useEffect(() => { refresh(); }, [refresh]);

  return refresh;
}
