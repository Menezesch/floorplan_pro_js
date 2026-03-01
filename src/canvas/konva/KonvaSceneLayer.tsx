import { Arc, Circle, Group, Layer, Line, Text } from 'react-konva';
import type { Opening, Project, Vec2, Wall } from '../../model/types';
import { measureDistance } from '../../geometry/measure';
import { wallSegmentToPolygon } from '../../geometry/polylineOffset';

interface RectDraft {
  start: Vec2;
  end: Vec2;
  kind: 'roomRect' | 'obstacle';
}

interface Props {
  project: Project;
  selectedId?: string;
  selectedKind?: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening';
  wallDraft?: { start: Vec2; end?: Vec2 };
  rectDraft?: RectDraft | null;
  measureDraft?: { start?: Vec2; end?: Vec2 };
  onSelect: (id?: string, kind?: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening') => void;
}

const flattenPoints = (points: { x: number; y: number }[]) => points.flatMap((p) => [p.x, p.y]);

const openingGeometry = (project: Project, opening: Opening) => {
  const wall = project.walls.find((w) => w.id === opening.wallId);
  if (!wall) return undefined;
  const [a, b] = wall.points;
  const len = Math.max(1e-6, measureDistance(a, b));
  const t = Math.max(0, Math.min(1, opening.distanceAlongM / len));
  const center = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { wall, center, angle, len };
};

const edgeSegmentsWithGaps = (wall: Wall, openings: Opening[]) => {
  const [a, b] = wall.points;
  const len = measureDistance(a, b);
  if (len < 1e-6) return [];
  const cuts = openings
    .map((o) => ({
      start: Math.max(0, o.distanceAlongM - o.widthM / 2),
      end: Math.min(len, o.distanceAlongM + o.widthM / 2)
    }))
    .sort((x, y) => x.start - y.start);

  const merged: { start: number; end: number }[] = [];
  for (const cut of cuts) {
    const last = merged.at(-1);
    if (!last || cut.start > last.end) merged.push({ ...cut });
    else last.end = Math.max(last.end, cut.end);
  }

  const segments: [Vec2, Vec2][] = [];
  let cursor = 0;
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  for (const cut of merged) {
    if (cut.start > cursor) {
      segments.push([
        { x: a.x + dir.x * cursor, y: a.y + dir.y * cursor },
        { x: a.x + dir.x * cut.start, y: a.y + dir.y * cut.start }
      ]);
    }
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < len) {
    segments.push([
      { x: a.x + dir.x * cursor, y: a.y + dir.y * cursor },
      { x: b.x, y: b.y }
    ]);
  }
  return segments;
};

const LockBadge = ({ x, y }: { x: number; y: number }) => <Text x={x} y={y} text="🔒" fontSize={0.5} fill="#334155" />;

const KonvaSceneLayer = ({ project, selectedId, selectedKind, wallDraft, rectDraft, measureDraft, onSelect }: Props) => (
  <Layer>
    <Line points={[-100, 0, 100, 0]} stroke="#ef4444" strokeWidth={0.01} listening={false} />
    <Line points={[0, -100, 0, 100]} stroke="#ef4444" strokeWidth={0.01} listening={false} />
    <Circle x={0} y={0} radius={0.08} fill="#ef4444" listening={false} />

    {project.rooms.map((room) => (
      <Group key={room.id} entityType="room" entityId={room.id} onMouseDown={() => onSelect(room.id, 'room')}>
        <Line points={flattenPoints(room.boundary)} closed fill="#dbeafe66" stroke="#1d4ed8" strokeWidth={0.02} />
        {room.locked && room.origin && <LockBadge x={room.origin.x} y={room.origin.y - 0.4} />}
      </Group>
    ))}

    {project.walls.map((wall) => {
      const edgeOpenings = project.openings.filter((o) => o.wallId === wall.id);
      const segments = edgeSegmentsWithGaps(wall, edgeOpenings);
      return (
        <Group key={wall.id} entityType="edge" entityId={wall.id} onMouseDown={() => onSelect(wall.id, 'edge')}>
          {segments.map(([s, e], i) => (
            <Line key={`${wall.id}-${i}`} points={flattenPoints(wallSegmentToPolygon(s, e, wall.thicknessM))} closed fill={selectedId === wall.id && selectedKind === 'edge' ? '#2563eb' : '#1f2937'} opacity={0.9} />
          ))}
          {wall.locked && <LockBadge x={wall.points[0].x} y={wall.points[0].y - 0.35} />}
        </Group>
      );
    })}

    {project.wallVertices.map((v) => (
      <Group key={v.id} entityType="vertex" entityId={v.id} onMouseDown={() => onSelect(v.id, 'vertex')}>
        <Circle x={v.x} y={v.y} radius={selectedId === v.id && selectedKind === 'vertex' ? 0.09 : 0.06} fill={v.locked ? '#f59e0b' : '#0ea5e9'} stroke="#0f172a" strokeWidth={0.01} />
        {v.locked && <LockBadge x={v.x + 0.08} y={v.y - 0.12} />}
      </Group>
    ))}

    {project.obstacles.map((obs) => (
      <Group key={obs.id} entityType="obstacle" entityId={obs.id} onMouseDown={() => onSelect(obs.id, 'obstacle')}>
        <Line points={flattenPoints(obs.polygon)} closed fill="#9ca3af88" stroke="#4b5563" strokeWidth={0.02} dash={[0.08, 0.06]} />
        {obs.locked && obs.origin && <LockBadge x={obs.origin.x} y={obs.origin.y - 0.4} />}
      </Group>
    ))}

    {project.openings.map((o) => {
      const geom = openingGeometry(project, o);
      if (!geom) return null;
      const radius = Math.max(0.2, o.widthM / 2);
      return (
        <Group key={o.id} entityType="opening" entityId={o.id} onMouseDown={() => onSelect(o.id, 'opening')}>
          {o.type === 'door' ? (
            <>
              <Arc x={geom.center.x} y={geom.center.y} innerRadius={radius - 0.02} outerRadius={radius} angle={90} rotation={geom.angle} stroke="#111827" strokeWidth={0.02} />
              <Line points={[geom.center.x, geom.center.y, geom.center.x + Math.cos((geom.angle * Math.PI) / 180) * radius, geom.center.y + Math.sin((geom.angle * Math.PI) / 180) * radius]} stroke="#111827" strokeWidth={0.02} />
            </>
          ) : (
            <>
              <Line points={[geom.center.x - radius * 0.5, geom.center.y - 0.03, geom.center.x + radius * 0.5, geom.center.y - 0.03]} stroke="#0f766e" strokeWidth={0.02} rotation={geom.angle} />
              <Line points={[geom.center.x - radius * 0.5, geom.center.y + 0.03, geom.center.x + radius * 0.5, geom.center.y + 0.03]} stroke="#0f766e" strokeWidth={0.02} rotation={geom.angle} />
            </>
          )}
          {o.locked && <LockBadge x={geom.center.x + 0.1} y={geom.center.y - 0.2} />}
        </Group>
      );
    })}

    {wallDraft && <Line points={[wallDraft.start.x, wallDraft.start.y, (wallDraft.end ?? wallDraft.start).x, (wallDraft.end ?? wallDraft.start).y]} stroke="#2563eb" strokeWidth={0.02} dash={[0.1, 0.06]} />}
    {rectDraft && <Line points={flattenPoints([rectDraft.start, { x: rectDraft.end.x, y: rectDraft.start.y }, rectDraft.end, { x: rectDraft.start.x, y: rectDraft.end.y }])} closed stroke={rectDraft.kind === 'roomRect' ? '#2563eb' : '#4b5563'} dash={[0.1, 0.1]} strokeWidth={0.02} />}
    {measureDraft?.start && measureDraft?.end && <Line points={[measureDraft.start.x, measureDraft.start.y, measureDraft.end.x, measureDraft.end.y]} stroke="#16a34a" dash={[0.08, 0.08]} strokeWidth={0.02} listening={false} />}
  </Layer>
);

export default KonvaSceneLayer;
