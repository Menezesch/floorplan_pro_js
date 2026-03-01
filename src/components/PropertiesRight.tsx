import { useState } from 'react';
import { useAppStore } from '../model/store';

const PropertiesRight = () => {
  const selectedId = useAppStore((s) => s.selectedId);
  const room = useAppStore((s) => s.project.rooms.find((r) => r.id === s.selectedId));
  const updateEntityName = useAppStore((s) => s.updateEntityName);
  const [name, setName] = useState(room?.name ?? '');
  return (
    <aside className="w-64 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Properties</h2>
      {!selectedId && <p className="text-xs text-slate-500">Select an entity to edit.</p>}
      {selectedId && (
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs text-slate-500">ID: {selectedId}</p>
          {room && (
            <>
              <input className="w-full rounded border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex gap-2">
                <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => updateEntityName(room.id, name)}>
                  Apply
                </button>
                <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setName(room.name)}>
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button className="mt-6 w-full cursor-not-allowed rounded bg-slate-200 px-3 py-2 text-xs text-slate-500" title="Phase 2/3" disabled>
        Compute (Phase 2/3)
      </button>
    </aside>
  );
};

export default PropertiesRight;
