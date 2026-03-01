import { useEffect, useMemo, useState } from 'react';
import { measureDistance } from '../geometry/measure';
import { useAppStore } from '../model/store';

const PropertiesRight = () => {
  const selectedId = useAppStore((s) => s.selectedId);
  const project = useAppStore((s) => s.project);
  const updateWallThickness = useAppStore((s) => s.updateWallThickness);
  const updateRoom = useAppStore((s) => s.updateRoom);
  const updateObstacle = useAppStore((s) => s.updateObstacle);
  const updateOpening = useAppStore((s) => s.updateOpening);

  const entity = useMemo(() => {
    const wall = project.walls.find((w) => w.id === selectedId);
    if (wall) return { kind: 'wall' as const, data: wall };
    const room = project.rooms.find((r) => r.id === selectedId);
    if (room) return { kind: 'room' as const, data: room };
    const obstacle = project.obstacles.find((o) => o.id === selectedId);
    if (obstacle) return { kind: 'obstacle' as const, data: obstacle };
    const opening = project.openings.find((o) => o.id === selectedId);
    if (opening) return { kind: 'opening' as const, data: opening };
    return undefined;
  }, [project, selectedId]);

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!entity) {
      setForm({});
      return;
    }
    if (entity.kind === 'wall') {
      setForm({ thicknessM: entity.data.thicknessM.toFixed(3) });
    }
    if (entity.kind === 'room') {
      setForm({
        name: entity.data.name,
        widthM: String(entity.data.widthM ?? 0),
        heightM: String(entity.data.heightM ?? 0),
        classification: entity.data.classification ?? 'internal'
      });
    }
    if (entity.kind === 'obstacle') {
      setForm({ widthM: String(entity.data.widthM ?? 0), heightM: String(entity.data.heightM ?? 0) });
    }
    if (entity.kind === 'opening') {
      setForm({ widthM: String(entity.data.widthM), distanceAlongM: String(entity.data.distanceAlongM) });
    }
  }, [entity, selectedId]);

  const onApply = () => {
    if (!entity) return;
    if (entity.kind === 'wall') {
      updateWallThickness(entity.data.id, Math.max(0.05, Number(form.thicknessM ?? entity.data.thicknessM)));
    }
    if (entity.kind === 'room') {
      updateRoom(entity.data.id, {
        name: form.name ?? entity.data.name,
        widthM: Math.max(0.01, Number(form.widthM ?? entity.data.widthM ?? 0)),
        heightM: Math.max(0.01, Number(form.heightM ?? entity.data.heightM ?? 0)),
        classification: (form.classification as 'internal' | 'external') ?? 'internal'
      });
    }
    if (entity.kind === 'obstacle') {
      updateObstacle(entity.data.id, {
        widthM: Math.max(0.01, Number(form.widthM ?? entity.data.widthM ?? 0)),
        heightM: Math.max(0.01, Number(form.heightM ?? entity.data.heightM ?? 0))
      });
    }
    if (entity.kind === 'opening') {
      updateOpening(entity.data.id, {
        widthM: Math.max(0.2, Number(form.widthM ?? entity.data.widthM)),
        distanceAlongM: Math.max(0, Number(form.distanceAlongM ?? entity.data.distanceAlongM))
      });
    }
  };

  const onReset = () => {
    if (!entity) return;
    if (entity.kind === 'wall') setForm({ thicknessM: entity.data.thicknessM.toFixed(3) });
    if (entity.kind === 'room') setForm({ name: entity.data.name, widthM: String(entity.data.widthM ?? 0), heightM: String(entity.data.heightM ?? 0), classification: entity.data.classification ?? 'internal' });
    if (entity.kind === 'obstacle') setForm({ widthM: String(entity.data.widthM ?? 0), heightM: String(entity.data.heightM ?? 0) });
    if (entity.kind === 'opening') setForm({ widthM: String(entity.data.widthM), distanceAlongM: String(entity.data.distanceAlongM) });
  };

  const wallLength = entity?.kind === 'wall' ? measureDistance(entity.data.points[0], entity.data.points[1]) : 0;

  return (
    <aside className="w-64 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Properties</h2>
      {!selectedId && <p className="text-xs text-slate-500">Select an entity to edit.</p>}
      {selectedId && entity && (
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs text-slate-500">ID: {selectedId}</p>
          {entity.kind === 'wall' && (
            <>
              <label className="block text-xs text-slate-600">Thickness (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.thicknessM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, thicknessM: e.target.value }))} />
              <p className="text-xs text-slate-600">Length: {wallLength.toFixed(2)} m</p>
            </>
          )}
          {entity.kind === 'room' && (
            <>
              <label className="block text-xs text-slate-600">Name</label>
              <input className="w-full rounded border px-2 py-1" value={form.name ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              <label className="block text-xs text-slate-600">Width (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.widthM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, widthM: e.target.value }))} />
              <label className="block text-xs text-slate-600">Height (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.heightM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, heightM: e.target.value }))} />
              <label className="block text-xs text-slate-600">Classification</label>
              <select className="w-full rounded border px-2 py-1" value={form.classification ?? 'internal'} onChange={(e) => setForm((prev) => ({ ...prev, classification: e.target.value }))}>
                <option value="internal">internal</option>
                <option value="external">external</option>
              </select>
            </>
          )}
          {entity.kind === 'obstacle' && (
            <>
              <label className="block text-xs text-slate-600">Width (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.widthM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, widthM: e.target.value }))} />
              <label className="block text-xs text-slate-600">Height (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.heightM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, heightM: e.target.value }))} />
            </>
          )}
          {entity.kind === 'opening' && (
            <>
              <label className="block text-xs text-slate-600">Width (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.widthM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, widthM: e.target.value }))} />
              <label className="block text-xs text-slate-600">Distance Along Wall (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.distanceAlongM ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, distanceAlongM: e.target.value }))} />
            </>
          )}
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={onApply}>
              Apply
            </button>
            <button className="rounded bg-slate-200 px-3 py-1" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      )}
      <button className="mt-6 w-full cursor-not-allowed rounded bg-slate-200 px-3 py-2 text-xs text-slate-500" title="Phase 3" disabled>
        Compute (Phase 3)
      </button>
    </aside>
  );
};

export default PropertiesRight;
