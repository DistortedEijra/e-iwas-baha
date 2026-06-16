import { useEffect, useState } from 'react';
import { FloodMap } from './components/FloodMap.tsx';
import { RoutePanel } from './components/RoutePanel.tsx';
import { AlertBanner } from './components/AlertBanner.tsx';
import { EvacList } from './components/EvacList.tsx';
import { useGeolocation } from './hooks/useGeolocation.ts';
import { useRoute } from './hooks/useRoute.ts';
import { useRealtime } from './hooks/useRealtime.ts';
import { useOffline } from './hooks/useOffline.ts';
import type { EvacCenter } from './types.ts';
import './App.css';

export default function App() {
  const [evacCenters, setEvacCenters] = useState<EvacCenter[]>([]);

  useGeolocation();
  useRoute();
  useRealtime();
  useOffline();

  useEffect(() => {
    fetch('/api/evac-centers')
      .then((r) => r.json())
      .then(setEvacCenters)
      .catch(console.error);
  }, []);

  return (
    <div className="app-layout">
      <AlertBanner />
      <div className="map-area">
        <FloodMap evacCenters={evacCenters} />
      </div>
      <aside className="side-panel">
        <RoutePanel />
        <EvacList centers={evacCenters} />
      </aside>
    </div>
  );
}
