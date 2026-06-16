import { useState, useEffect, useCallback } from 'react';

interface Stats {
  reports_today: number;
  active_centers: number;
  affected_segments: number;
}

export function StatsBar({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setStats(await res.json());
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!stats) return <div className="admin-stats"><span className="spinner" /> Loading stats…</div>;

  return (
    <div className="admin-stats">
      <div className="stat-card">
        <div className="stat-n">{stats.reports_today}</div>
        <div className="stat-label">Reports today</div>
      </div>
      <div className="stat-card">
        <div className="stat-n">{stats.active_centers}</div>
        <div className="stat-label">Active centers</div>
      </div>
      <div className={`stat-card ${stats.affected_segments > 0 ? 'stat-card-alert' : ''}`}>
        <div className="stat-n">{stats.affected_segments}</div>
        <div className="stat-label">Affected segments</div>
      </div>
      <button className="btn-refresh" onClick={load} title="Refresh stats">↻ Refresh</button>
    </div>
  );
}
