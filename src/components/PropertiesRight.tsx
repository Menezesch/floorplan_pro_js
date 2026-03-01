import { useMemo, useState } from 'react';
import { useAppStore } from '../model/store';
import { wallLengthM } from '../geometry/measure';

const PropertiesRight = () => {
  const project = useAppStore((s) => s.project);
  const selectedId = useAppStore((s) => s.selectedId);
  const updateWall = useAppStore((s) => s.updateWall);
  const updateRoom = useAppStore((s) => s.updateRoom);

  const wall = useMemo(() => project.walls.find((item) => item.id === selectedId), [project.walls, selectedId]);
  const room = useMemo(() => project.rooms.find((item) => item.id === selectedId), [project.rooms, selectedId]);

  const [wallThickness, setWallThickness] = useState<number>(wall?.thicknessM ?? 0.15);
  const [roomName, setRoomName] = useState(room?.name ?? '');
  const [roomWidth, setRoomWidth] = useState(room?.widthM ?? 1);
  const [roomHeight, setRoomHeight] = useState(room?.heightM ?? 1);

  return (
    <aside className="w-72 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Properties</h2>
      {!selectedId && <p className="text-xs text-slate-500">Select an entity to edit.</p>}

      {wall && (
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs text-slate-500">Wall: {wall.id}</p>
          <label className="flex flex-col gap-1">
            Thickness (m)
            <input type="number" step="0.01" value={wallThickness} onChange={(e) => setWallThickness(Number(e.target.value))} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Length (m)
            <input readOnly value={wallLengthM(wall).toFixed(2)} className="rounded border bg-slate-100 px-2 py-1" />
          </label>
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => updateWall(wall.id, { thicknessM: wallThickness })}>
              Apply
            </button>
            <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setWallThickness(wall.thicknessM)}>
              Reset
            </button>
          </div>
        </div>
      )}

      {room && (
        <div className="space-y-2 text-sm">
          <p className="font-mono text-xs text-slate-500">Room: {room.id}</p>
          <label className="flex flex-col gap-1">
            Name
            <input className="rounded border px-2 py-1" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Width (m)
            <input type="number" step="0.05" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value))} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Height (m)
            <input type="number" step="0.05" value={roomHeight} onChange={(e) => setRoomHeight(Number(e.target.value))} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Type
            <select className="rounded border px-2 py-1" value={room.classification} onChange={(e) => updateRoom(room.id, { classification: e.target.value as 'internal' | 'external' })}>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <p>Area: {(room.widthM * room.heightM).toFixed(2)} m²</p>
            <p>Perimeter: {(2 * (room.widthM + room.heightM)).toFixed(2)} m</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={() => updateRoom(room.id, { name: roomName, widthM: roomWidth, heightM: roomHeight })}>
              Apply
            </button>
            <button
              className="rounded bg-slate-200 px-3 py-1"
              onClick={() => {
                setRoomName(room.name);
                setRoomWidth(room.widthM);
                setRoomHeight(room.heightM);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <button
        className="mt-6 w-full cursor-not-allowed rounded bg-slate-200 px-3 py-2 text-xs text-slate-500"
        title="Phase 2/3"
        disabled
      >
        Compute (Phase 2/3)
      </button>
    </aside>
  );
};

export default PropertiesRight;
