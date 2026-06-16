import { useState, useEffect, useCallback } from 'react';

interface ActiveSegment {
  id: number;
  name: string | null;
  highway: string | null;
  flood_depth_m: number;
  passable: boolean;
  updated_at: string;
}

export function SegmentControl({ token }: { token: string }) {
  const [segId, setSegId] = useState('');
  const [depth, setDepth] = useState('');
  const [active, setActive] = useState<ActiveSegment[]>([]);
  const [msg, setMsg] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadActive = useCallback(async () => {
    const res = await fetch('/api/admin/segments/active', { headers });
    if (res.ok) setActive(await res.json());
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadActive(); }, [loadActive]);

  async function setFlood(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/admin/segments/${segId}/flood`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ flood_depth_m: parseFloat(depth) }),
    });
    setMsg(res.ok ? `Segment ${segId} updated to ${depth} m.` : 'Error — check segment ID.');
    setSegId('');
    setDepth('');
    loadActive();
  }

  async function clearSegment(id: number) {
    await fetch(`/api/admin/segments/${id}/clear`, { method: 'POST', headers });
    setActive((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="admin-card">
      <h3>Road Flood Control</h3>

      <form onSubmit={setFlood} className="admin-form">
        <input
          type="number"
          placeholder="Segment ID"
          value={segId}
          onChange={(e) => setSegId(e.target.value)}
          min="1"
          required
        />
        <input
          type="number"
          placeholder="Depth (m)"
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
          min="0"
          max="5"
          step="0.01"
          required
        />
        <button type="submit" className="btn-admin-primary">Set Flood</button>
      </form>
      {msg && <p className="form-msg">{msg}</p>}

      {active.length > 0 ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Road</th>
              <th>Depth (m)</th>
              <th>Passable</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {active.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name ?? s.highway ?? '—'}</td>
                <td className={s.flood_depth_m >= 0.5 ? 'text-red' : 'text-amber'}>
                  {s.flood_depth_m.toFixed(2)}
                </td>
                <td>{s.passable ? '✓' : '✗'}</td>
                <td>{new Date(s.updated_at).toLocaleTimeString()}</td>
                <td>
                  <button className="btn-clear" onClick={() => clearSegment(s.id)}>
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-msg">No flooded or blocked segments.</p>
      )}
    </div>
  );
}
