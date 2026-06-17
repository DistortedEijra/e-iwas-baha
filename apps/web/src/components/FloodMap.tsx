import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../store/index.ts';
import type { EvacCenter, RouteFeature } from '../types.ts';
import { buildSteps, findCurrentStep, type DirectionStep, type StepType } from '../lib/directions.ts';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const EVAC_ICON = new L.Icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  shadowSize: [41, 41], className: 'evac-marker-icon',
});

const USER_ICON = L.divIcon({
  className: '',
  html: '<div class="user-pulse-ring"></div><div class="user-pulse-dot"></div>',
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const MARIKINA_CENTER: [number, number] = [14.6507, 121.1029];

const STEP_ICON: Record<StepType, string> = {
  depart: '◉',
  'turn-left': '↰',
  'turn-right': '↱',
  straight: '↑',
  arrive: '★',
};

const TURN_BG: Record<StepType, string> = {
  depart: '#3b82f6',
  'turn-left': '#f59e0b',
  'turn-right': '#f59e0b',
  straight: '#3b82f6',
  arrive: '#059669',
};

// GeoJSON [lng, lat] bearing
function geoJsonBearing(c1: [number, number], c2: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(c1[1]), φ2 = toRad(c2[1]);
  const Δλ = toRad(c2[0] - c1[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function segColor(depth: number | null, isDone: boolean, isFlash: boolean, isCurrent: boolean): string {
  if (isFlash) return '#7c3aed';
  if (isDone) return '#9ca3af';
  if (!depth || depth <= 0) return isCurrent ? '#1d4ed8' : '#93c5fd';
  if (depth < 0.3) return '#f59e0b';
  return '#ef4444';
}

// ── Sub-components inside MapContainer ──────────────────────────────────────

function MapClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPlace(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function RouteLayer({
  features, updatedIds, doneSet, currentSet,
}: {
  features: RouteFeature[];
  updatedIds: Set<number>;
  doneSet: Set<number>;
  currentSet: Set<number>;
}) {
  return (
    <>
      {features.map((f, i) => {
        if (!f.geometry?.coordinates?.length) return null;
        const positions = f.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        const isDone    = doneSet.has(i);
        const isCurrent = currentSet.has(i);
        const isFlash   = updatedIds.has(f.properties.segmentId);

        return (
          <Polyline
            key={f.properties.segmentId}
            positions={positions}
            pathOptions={{
              color:     segColor(f.properties.floodDepthM, isDone, isFlash, isCurrent),
              weight:    isCurrent ? 10 : 6,
              opacity:   isDone ? 0.35 : 0.9,
              lineCap:   'round',
              lineJoin:  'round',
              className: isCurrent ? 'route-flow-animated' : '',
            }}
          >
            <Popup>
              <strong>{f.properties.name ?? f.properties.highway ?? 'Road'}</strong>
              {(f.properties.floodDepthM ?? 0) > 0 && (
                <><br />⚠ Flood depth: {f.properties.floodDepthM!.toFixed(2)} m</>
              )}
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

// Small rotated ▶ arrow at the midpoint of each upcoming/current segment
function BearingArrows({ features, doneSet }: { features: RouteFeature[]; doneSet: Set<number> }) {
  const markers = useMemo(() => {
    return features.flatMap((f, i) => {
      if (doneSet.has(i)) return [];
      const coords = f.geometry.coordinates;
      if (coords.length < 2) return [];
      const mid = Math.floor(coords.length / 2);
      const [lng, lat] = coords[mid];
      const b = geoJsonBearing(coords[Math.max(0, mid - 1)], coords[mid]);
      const icon = L.divIcon({
        className: '',
        html: `<div class="bearing-arrow" style="transform:rotate(${b}deg)">▶</div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      return [{ key: `arr-${f.properties.segmentId}`, lat, lng, icon }];
    });
  }, [features, doneSet]);

  return (
    <>
      {markers.map((m) => (
        <Marker key={m.key} position={[m.lat, m.lng]} icon={m.icon} interactive={false} />
      ))}
    </>
  );
}

// Turn direction markers at each junction between steps
function TurnMarkers({ steps, features }: { steps: DirectionStep[]; features: RouteFeature[] }) {
  const items = useMemo(() => {
    return steps
      .filter((s) => (s.type === 'turn-left' || s.type === 'turn-right') && s.segmentIndices.length > 0)
      .map((s, i) => {
        const segIdx = s.segmentIndices[0];
        const f = features[segIdx];
        if (!f?.geometry.coordinates.length) return null;
        const [lng, lat] = f.geometry.coordinates[0];
        const icon = L.divIcon({
          className: '',
          html: `<div class="turn-marker" style="background:${TURN_BG[s.type]}">${STEP_ICON[s.type]}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
        });
        return { key: `turn-${i}`, lat, lng, icon, instruction: s.instruction };
      })
      .filter(Boolean) as { key: string; lat: number; lng: number; icon: L.DivIcon; instruction: string }[];
  }, [steps, features]);

  return (
    <>
      {items.map((m) => (
        <Marker key={m.key} position={[m.lat, m.lng]} icon={m.icon}>
          <Popup>{m.instruction}</Popup>
        </Marker>
      ))}
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  evacCenters: EvacCenter[];
}

function formatDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function FloodMap({ evacCenters }: Props) {
  const position          = useAppStore((s) => s.position);
  const isManualPosition  = useAppStore((s) => s.isManualPosition);
  const setManualPosition = useAppStore((s) => s.setManualPosition);
  const clearManualPosition = useAppStore((s) => s.clearManualPosition);
  const routeResult  = useAppStore((s) => s.routeResult);
  const floodUpdates = useAppStore((s) => s.floodUpdates);

  const features        = routeResult?.route?.features ?? [];
  const destinationName = routeResult?.evacuationCenter ?? 'Evacuation Center';

  const steps = useMemo(
    () => buildSteps(features, destinationName),
    [features, destinationName],
  );

  const currentStep = useMemo(() => {
    if (!position || features.length === 0) return 0;
    return findCurrentStep(steps, features, position.lat, position.lng);
  }, [steps, features, position]);

  const doneSet    = useMemo(() => new Set(steps.slice(0, currentStep).flatMap((s) => s.segmentIndices)), [steps, currentStep]);
  const currentSet = useMemo(() => new Set(steps[currentStep]?.segmentIndices ?? []), [steps, currentStep]);
  const updatedIds = useMemo(() => new Set(Array.from(floodUpdates.keys())), [floodUpdates]);

  const nextStep        = steps[currentStep + 1] ?? null;
  const currentStepDist = steps[currentStep]?.distanceM ?? 0;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={MARIKINA_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <MapClickHandler onPlace={(lat, lng) => setManualPosition({ lat, lng })} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {features.length > 0 && (
          <>
            <RouteLayer features={features} updatedIds={updatedIds} doneSet={doneSet} currentSet={currentSet} />
            <BearingArrows features={features} doneSet={doneSet} />
            <TurnMarkers steps={steps} features={features} />
          </>
        )}

        {evacCenters.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={EVAC_ICON}>
            <Popup maxWidth={240}>
              <strong>{c.name}</strong>
              {c.address && <><br /><span style={{ fontSize: 12, color: '#6b7280' }}>{c.address}</span></>}
              {c.capacity && <><br />Capacity: <strong>{c.capacity.toLocaleString()}</strong></>}
            </Popup>
          </Marker>
        ))}

        {position && (
          <>
            <FlyToUser lat={position.lat} lng={position.lng} />
            <Marker
              position={[position.lat, position.lng]}
              icon={USER_ICON}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = e.target.getLatLng();
                  setManualPosition({ lat, lng });
                },
              }}
            >
              <Popup>{isManualPosition ? '📍 Simulated position — drag to move' : 'Your GPS location'}</Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* ── Next Turn HUD ── */}
      {nextStep && position && (
        <div className="next-turn-hud">
          <div className="hud-icon-box" style={{ background: TURN_BG[nextStep.type] }}>
            {STEP_ICON[nextStep.type]}
          </div>
          <div className="hud-text">
            <div className="hud-in">In {formatDist(currentStepDist)}</div>
            <div className="hud-instruction">{nextStep.instruction}</div>
            {nextStep.hasFlood && (
              <div className="hud-flood-warn">⚠ Flooded section ahead</div>
            )}
          </div>
        </div>
      )}

      {/* ── Arrive banner ── */}
      {steps[currentStep]?.type === 'arrive' && position && (
        <div className="arrive-banner">★ You have arrived at {destinationName}</div>
      )}

      {/* ── Click-to-position hint (shown when no position yet) ── */}
      {!position && (
        <div className="map-hint">
          📍 Click anywhere on the map to set your position
        </div>
      )}

      {/* ── Manual position indicator + GPS button ── */}
      {isManualPosition && (
        <div className="manual-pos-chip">
          📍 Simulated position
          <button className="btn-use-gps" onClick={clearManualPosition} title="Switch back to GPS">
            Use GPS
          </button>
        </div>
      )}
    </div>
  );
}
