import { useEffect } from 'react';
import { useAppStore } from '../store/index.ts';

export function AlertBanner() {
  const alerts = useAppStore((s) => s.alerts);
  const dismissAlert = useAppStore((s) => s.dismissAlert);

  const latest = alerts[alerts.length - 1];

  // Auto-dismiss each alert after 5 s
  useEffect(() => {
    if (!latest) return;
    const t = setTimeout(() => dismissAlert(latest.id), 5000);
    return () => clearTimeout(t);
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!latest) return null;

  return (
    <div className={`alert-banner alert-${latest.type}`} role="alert">
      <span className="alert-msg">{latest.message}</span>
      <button
        className="alert-close"
        onClick={() => dismissAlert(latest.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
