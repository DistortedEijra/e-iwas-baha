import { useMemo } from 'react';
import { useAppStore } from '../store/index.ts';
import { DirectionSteps } from './DirectionSteps.tsx';
import { computeEtaMin } from '../lib/directions.ts';

export function RoutePanel() {
  const position            = useAppStore((s) => s.position);
  const positionError       = useAppStore((s) => s.positionError);
  const routeResult         = useAppStore((s) => s.routeResult);
  const routeLoading        = useAppStore((s) => s.routeLoading);
  const isOffline           = useAppStore((s) => s.isOffline);
  const isRerouting         = useAppStore((s) => s.isRerouting);
  const triggerReroute      = useAppStore((s) => s.triggerReroute);
  const evacCenters         = useAppStore((s) => s.evacCenters);
  const selectedCenterId    = useAppStore((s) => s.selectedCenterId);
  const setSelectedCenterId = useAppStore((s) => s.setSelectedCenterId);

  const activeCenters = useMemo(
    () => evacCenters.filter((c) => c.active),
    [evacCenters],
  );

  const features = routeResult?.route?.features ?? [];

  const etaMin = useMemo(() => computeEtaMin(features), [features]);
  const floodedCount = useMemo(
    () => features.filter((f) => (f.properties.floodDepthM ?? 0) > 0).length,
    [features],
  );

  return (
    <div className="route-panel">
      <div className="route-panel-header">
        <h1>E-Iwas Baha</h1>
        <p className="tagline">Flood-aware evacuation routing</p>
      </div>

      {isOffline && (
        <div className="offline-chip" role="status">
          Offline — showing cached route
        </div>
      )}

      {isRerouting && routeLoading && (
        <div className="rerouting-banner">
          <span className="spinner" />
          Flood update detected — recalculating route…
        </div>
      )}

      {positionError && (
        <div className="panel-status error">
          <strong>Location error</strong>
          <span>{positionError}</span>
          <span className="hint">Allow location access and refresh.</span>
        </div>
      )}

      {!positionError && !position && (
        <div className="panel-status">
          <span className="spinner" /> Acquiring your location…
        </div>
      )}

      {position && routeLoading && !isRerouting && (
        <div className="panel-status">
          <span className="spinner" /> Calculating safest route…
        </div>
      )}

      {position && !routeLoading && !routeResult && (
        <div className="panel-status muted">
          Ready — route will appear once location is confirmed.
        </div>
      )}

      {routeResult && !routeLoading && (
        <>
          {routeResult.reachable ? (
            <div className="route-summary">
              <div className="badge badge-safe">Safe Route Found</div>

              <div className="stat-row">
                <span className="stat-label">Destination</span>
                <span className="stat-value">{routeResult.evacuationCenter ?? '—'}</span>
              </div>

              <div className="stat-row">
                <span className="stat-label">Distance</span>
                <span className="stat-value">
                  {routeResult.totalLengthM != null
                    ? `${(routeResult.totalLengthM / 1000).toFixed(2)} km`
                    : '—'}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label">Est. walking time</span>
                <span className="stat-value">{etaMin} min</span>
              </div>

              {floodedCount > 0 && (
                <div className="stat-row warn">
                  <span className="stat-label">Flooded segments</span>
                  <span className="stat-value">{floodedCount} — proceed carefully</span>
                </div>
              )}

              <div className="legend">
                <p className="legend-title">Route colours</p>
                <ul>
                  <li><span className="dot dot-blue" /> Clear road</li>
                  <li><span className="dot dot-amber" /> Shallow water (&lt; 30 cm)</li>
                  <li><span className="dot dot-red" /> Deep water (30–50 cm)</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="route-summary">
              <div className="badge badge-danger">No Safe Route</div>
              <p className="muted">
                {routeResult.message ??
                  'All evacuation paths are currently blocked by floodwater.'}
              </p>
            </div>
          )}

          {routeResult.reachable && features.length > 0 && (
            <DirectionSteps
              features={features}
              destinationName={routeResult.evacuationCenter ?? 'Evacuation Center'}
              userPosition={position}
            />
          )}
        </>
      )}

      {/* Evacuation site picker */}
      {activeCenters.length > 1 && (
        <div className="center-picker">
          <p className="center-picker-label">Evacuation site</p>
          <div className="center-picker-list">
            <button
              className={`center-btn${selectedCenterId === null ? ' center-btn-active' : ''}`}
              onClick={() => setSelectedCenterId(null)}
            >
              Nearest (auto)
            </button>
            {activeCenters.map((c) => (
              <button
                key={c.id}
                className={`center-btn${selectedCenterId === c.id ? ' center-btn-active' : ''}`}
                onClick={() => setSelectedCenterId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {position && !isOffline && (
        <button className="btn-reroute" onClick={triggerReroute}>
          Recalculate Route
        </button>
      )}
    </div>
  );
}
