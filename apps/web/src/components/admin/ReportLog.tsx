import { useState, useEffect, useCallback } from 'react';

interface Report {
  id: number;
  segment_id: number;
  flood_depth_m: number;
  source: string;
  reported_at: string;
  segment_name: string | null;
  highway: string | null;
}

export function ReportLog({ token }: { token: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/reports', { headers });
    if (res.ok) setReports(await res.json());
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="admin-card">
      <div className="card-header">
        <h3>Recent Reports</h3>
        <button className="btn-refresh" onClick={load}>↻</button>
      </div>
      {reports.length === 0 ? (
        <p className="empty-msg">No reports recorded yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Segment</th>
              <th>Depth (m)</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(r.reported_at).toLocaleString()}
                </td>
                <td>
                  #{r.segment_id}
                  {(r.segment_name ?? r.highway) && (
                    <span style={{ color: '#9ca3af' }}> {r.segment_name ?? r.highway}</span>
                  )}
                </td>
                <td className={r.flood_depth_m >= 0.5 ? 'text-red' : 'text-amber'}>
                  {r.flood_depth_m.toFixed(2)}
                </td>
                <td style={{ textTransform: 'capitalize' }}>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
