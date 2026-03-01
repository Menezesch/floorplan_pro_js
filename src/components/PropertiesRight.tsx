import { useEffect, useMemo, useState } from 'react';
import { measureDistance } from '../geometry/measure';
import { useAppStore } from '../model/store';

const PropertiesRight = () => {
  const selectedId = useAppStore((s) => s.selectedId);
  const selectedKind = useAppStore((s) => s.selectedKind);
  const project = useAppStore((s) => s.project);
  const updateWallThickness = useAppStore((s) => s.updateWallThickness);
  const updateRoom = useAppStore((s) => s.updateRoom);
  const updateObstacle = useAppStore((s) => s.updateObstacle);
  const updateOpening = useAppStore((s) => s.updateOpening);
  const updateVertex = useAppStore((s) => s.updateVertex);
  const updateEdge = useAppStore((s) => s.updateEdge);

  const entity = useMemo(() => {
    if (!selectedId || !selectedKind) return undefined;
    if (selectedKind === 'edge') return { kind: 'edge' as const, data: project.wallEdges.find((e) => e.id === selectedId), wall: project.walls.find((w) => w.id === selectedId) };
    if (selectedKind === 'vertex') return { kind: 'vertex' as const, data: project.wallVertices.find((v) => v.id === selectedId) };
    if (selectedKind === 'room') return { kind: 'room' as const, data: project.rooms.find((r) => r.id === selectedId) };
    if (selectedKind === 'obstacle') return { kind: 'obstacle' as const, data: project.obstacles.find((o) => o.id === selectedId) };
    if (selectedKind === 'opening') return { kind: 'opening' as const, data: project.openings.find((o) => o.id === selectedId) };
    return undefined;
  }, [project, selectedId, selectedKind]);

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!entity?.data) return setForm({});
    if (entity.kind === 'edge') setForm({ thicknessM: entity.data.thicknessM.toFixed(3), locked: String(Boolean(entity.data.locked)) });
    if (entity.kind === 'vertex') setForm({ locked: String(Boolean(entity.data.locked)) });
    if (entity.kind === 'room') setForm({ name: entity.data.name, widthM: String(entity.data.widthM ?? 0), heightM: String(entity.data.heightM ?? 0), classification: entity.data.classification ?? 'internal', locked: String(Boolean(entity.data.locked)) });
    if (entity.kind === 'obstacle') setForm({ widthM: String(entity.data.widthM ?? 0), heightM: String(entity.data.heightM ?? 0), locked: String(Boolean(entity.data.locked)) });
    if (entity.kind === 'opening') setForm({ widthM: String(entity.data.widthM), distanceAlongM: String(entity.data.distanceAlongM), locked: String(Boolean(entity.data.locked)) });
  }, [entity, selectedId]);

  const onApply = () => {
    if (!entity?.data) return;
    if (entity.kind === 'edge') {
      updateWallThickness(entity.data.id, Math.max(0.05, Number(form.thicknessM ?? entity.data.thicknessM)));
      updateEdge(entity.data.id, { locked: form.locked === 'true' });
    }
    if (entity.kind === 'vertex') updateVertex(entity.data.id, { locked: form.locked === 'true' });
    if (entity.kind === 'room') updateRoom(entity.data.id, { name: form.name, widthM: Math.max(0.01, Number(form.widthM)), heightM: Math.max(0.01, Number(form.heightM)), classification: (form.classification as 'internal' | 'external') ?? 'internal', locked: form.locked === 'true' });
    if (entity.kind === 'obstacle') updateObstacle(entity.data.id, { widthM: Math.max(0.01, Number(form.widthM)), heightM: Math.max(0.01, Number(form.heightM)), locked: form.locked === 'true' });
    if (entity.kind === 'opening') updateOpening(entity.data.id, { widthM: Math.max(0.2, Number(form.widthM)), distanceAlongM: Math.max(0, Number(form.distanceAlongM)), locked: form.locked === 'true' });
  };

  const wallLength = entity?.kind === 'edge' && entity.wall ? measureDistance(entity.wall.points[0], entity.wall.points[1]) : 0;

  return (
    <aside className="w-64 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Properties</h2>
      {!entity?.data && <p className="text-xs text-slate-500">Select an entity to edit.</p>}
      {entity?.data && (
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs text-slate-500">ID: {selectedId}</p>
          {entity.kind === 'edge' && (
            <>
              <label className="block text-xs text-slate-600">Thickness (m)</label>
              <input className="w-full rounded border px-2 py-1" value={form.thicknessM ?? ''} onChange={(e) => setForm((p) => ({ ...p, thicknessM: e.target.value }))} />
              <p className="text-xs text-slate-600">Length: {wallLength.toFixed(2)} m</p>
            </>
          )}
          {entity.kind === 'room' && (
            <>
              <input className="w-full rounded border px-2 py-1" value={form.name ?? ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="w-full rounded border px-2 py-1" value={form.widthM ?? ''} onChange={(e) => setForm((p) => ({ ...p, widthM: e.target.value }))} />
              <input className="w-full rounded border px-2 py-1" value={form.heightM ?? ''} onChange={(e) => setForm((p) => ({ ...p, heightM: e.target.value }))} />
              <select className="w-full rounded border px-2 py-1" value={form.classification ?? 'internal'} onChange={(e) => setForm((p) => ({ ...p, classification: e.target.value }))}>
                <option value="internal">internal</option><option value="external">external</option>
              </select>
            </>
          )}
          {entity.kind === 'obstacle' && (
            <>
              <input className="w-full rounded border px-2 py-1" value={form.widthM ?? ''} onChange={(e) => setForm((p) => ({ ...p, widthM: e.target.value }))} />
              <input className="w-full rounded border px-2 py-1" value={form.heightM ?? ''} onChange={(e) => setForm((p) => ({ ...p, heightM: e.target.value }))} />
            </>
          )}
          {entity.kind === 'opening' && (
            <>
              <input className="w-full rounded border px-2 py-1" value={form.widthM ?? ''} onChange={(e) => setForm((p) => ({ ...p, widthM: e.target.value }))} />
              <input className="w-full rounded border px-2 py-1" value={form.distanceAlongM ?? ''} onChange={(e) => setForm((p) => ({ ...p, distanceAlongM: e.target.value }))} />
            </>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={form.locked === 'true'} onChange={(e) => setForm((p) => ({ ...p, locked: String(e.target.checked) }))} /> Locked</label>
          <div className="flex gap-2"><button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={onApply}>Apply</button></div>
        </div>
      )}
      <button className="mt-6 w-full cursor-not-allowed rounded bg-slate-200 px-3 py-2 text-xs text-slate-500" title="Phase 3" disabled>Compute (Phase 3)</button>
    </aside>
  );
};

export default PropertiesRight;
