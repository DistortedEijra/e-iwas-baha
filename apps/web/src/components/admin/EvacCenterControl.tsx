import { useState, useEffect, useCallback } from 'react';

interface Center {
  id: number;
  name: string;
  address: string | null;
  capacity: number | null;
  active: boolean;
}

export function EvacCenterControl({ token }: { token: string }) {
  const [centers, setCenters] = useState<Center[]>([]);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/evac-centers', { headers });
    if (res.ok) setCenters(await res.json());
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function toggle(id: number, active: boolean) {
    await fetch(`/api/admin/evac-centers/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ active }),
    });
    setCenters((cs) => cs.map((c) => (c.id === id ? { ...c, active } : c)));
  }

  return (
    <div className="admin-card">
      <div className="card-header">
        <h3>Evacuation Centers</h3>
        <button className="btn-refresh" onClick={load}>↻</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Capacity</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {centers.map((c) => (
            <tr key={c.id} className={c.active ? '' : 'row-inactive'}>
              <td>{c.name}</td>
              <td>{c.capacity?.toLocaleString() ?? '—'}</td>
              <td>
                <span className={`status-chip ${c.active ? 'chip-green' : 'chip-gray'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button
                  className={c.active ? 'btn-deactivate' : 'btn-activate'}
                  onClick={() => toggle(c.id, !c.active)}
                >
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
