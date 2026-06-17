import { useEffect } from 'react';
import { FloodMap } from './components/FloodMap.tsx';
import { RoutePanel } from './components/RoutePanel.tsx';
import { AlertBanner } from './components/AlertBanner.tsx';
import { EvacList } from './components/EvacList.tsx';
import { useGeolocation } from './hooks/useGeolocation.ts';
import { useRoute } from './hooks/useRoute.ts';
import { useRealtime } from './hooks/useRealtime.ts';
import { useOffline } from './hooks/useOffline.ts';
import { useAppStore } from './store/index.ts';
import './App.css';

export default function App() {
  const evacCenters = useAppStore((s) => s.evacCenters);
  const setEvacCenters = useAppStore((s) => s.setEvacCenters);

  useGeolocation();
  useRoute();
  useRealtime();
  useOffline();

  useEffect(() => {
    fetch('/api/evac-centers')
      .then((r) => r.json())
      .then(setEvacCenters)
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
