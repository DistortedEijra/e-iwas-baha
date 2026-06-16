import type { EvacCenter } from '../types.ts';

interface Props {
  centers: EvacCenter[];
}

export function EvacList({ centers }: Props) {
  if (centers.length === 0) return null;

  return (
    <div className="evac-list">
      <h2 className="evac-list-title">Evacuation Centers</h2>
      <ul>
        {centers.map((c) => (
          <li key={c.id} className="evac-item">
            <div className="evac-name">{c.name}</div>
            {c.address && <div className="evac-address">{c.address}</div>}
            {c.capacity && (
              <div className="evac-cap">
                Capacity: {c.capacity.toLocaleString()} persons
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
