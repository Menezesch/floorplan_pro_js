import { Arc, Circle, Group, Layer, Line, Rect, Text } from 'react-konva';
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
  activeTool: 'select' | 'move' | 'wall' | 'roomRect' | 'obstacle' | 'door' | 'window' | 'measure';
  hoveredVertexId?: string;
  vertexHandleRadius: number;
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
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const normal = { x: -dir.y, y: dir.x };
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { wall, center, dir, normal, angle, len };
};

const edgeSegmentsWithGaps = (wall: Wall, openings: Opening[]) => {
  const [a, b] = wall.points;
  const len = measureDistance(a, b);
  if (len < 1e-6) return [];
  const cuts = openings.map((o) => ({ start: Math.max(0, o.distanceAlongM - o.widthM / 2), end: Math.min(len, o.distanceAlongM + o.widthM / 2) })).sort((x, y) => x.start - y.start);
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
    if (cut.start > cursor) segments.push([{ x: a.x + dir.x * cursor, y: a.y + dir.y * cursor }, { x: a.x + dir.x * cut.start, y: a.y + dir.y * cut.start }]);
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < len) segments.push([{ x: a.x + dir.x * cursor, y: a.y + dir.y * cursor }, { x: b.x, y: b.y }]);
  return segments;
};

const LockBadge = ({ x, y }: { x: number; y: number }) => <Text x={x} y={y} text="🔒" fontSize={0.5} fill="#334155" listening={false} />;

const KonvaSceneLayer = ({ project, selectedId, selectedKind, activeTool, hoveredVertexId, vertexHandleRadius, wallDraft, rectDraft, measureDraft, onSelect }: Props) => {
  const degreeMap = new Map<string, number>();
  const thicknessMap = new Map<string, number>();
  for (const e of project.wallEdges) {
    degreeMap.set(e.v1Id, (degreeMap.get(e.v1Id) ?? 0) + 1);
    degreeMap.set(e.v2Id, (degreeMap.get(e.v2Id) ?? 0) + 1);
    thicknessMap.set(e.v1Id, Math.max(thicknessMap.get(e.v1Id) ?? 0, e.thicknessM));
    thicknessMap.set(e.v2Id, Math.max(thicknessMap.get(e.v2Id) ?? 0, e.thicknessM));
  }

  return (
    <Layer>
      <Line points={[-100, 0, 100, 0]} stroke="#ef4444" strokeWidth={0.01} listening={false} />
      <Line points={[0, -100, 0, 100]} stroke="#ef4444" strokeWidth={0.01} listening={false} />
      <Circle x={0} y={0} radius={0.08} fill="#ef4444" listening={false} />

      {project.walls.map((wall) => {
        const edgeOpenings = project.openings.filter((o) => o.wallId === wall.id);
        const segments = edgeSegmentsWithGaps(wall, edgeOpenings);
        return (
          <Group key={wall.id}>
            {segments.map(([s, e], i) => {
              const outer = wallSegmentToPolygon(s, e, wall.thicknessM);
              const innerT = Math.max(0, wall.thicknessM - 0.06);
              const inner = innerT > 0.015 ? wallSegmentToPolygon(s, e, innerT) : undefined;
              return (
                <Group key={`${wall.id}-${i}`} entityType="edge" entityId={wall.id} onMouseDown={() => onSelect(wall.id, 'edge')}>
                  <Line points={flattenPoints(outer)} closed fill={selectedId === wall.id && selectedKind === 'edge' ? '#334155' : '#1f2937'} opacity={0.95} listening />
                  {inner && <Line points={flattenPoints(inner)} closed fill="#ffffff" listening={false} />}
                  <Line points={[s.x, s.y, e.x, e.y]} stroke="#000000" strokeWidth={Math.max(0.25, wall.thicknessM * 2)} opacity={0} listening hitStrokeWidth={24} perfectDrawEnabled={false} entityType="edge" entityId={wall.id} onMouseDown={() => onSelect(wall.id, 'edge')} />
                </Group>
              );
            })}
            {wall.locked && <LockBadge x={wall.points[0].x} y={wall.points[0].y - 0.35} />}
          </Group>
        );
      })}

      {project.wallVertices.map((v) => {
        const show = activeTool === 'move' || hoveredVertexId === v.id || (selectedKind === 'vertex' && selectedId === v.id) || (selectedKind === 'edge' && project.wallEdges.some((e) => e.id === selectedId && (e.v1Id === v.id || e.v2Id === v.id)));
        return (
          <Group key={v.id}>
            {(degreeMap.get(v.id) ?? 0) >= 2 && (
              <Rect x={v.x - (Math.max(0.12, thicknessMap.get(v.id) ?? 0.15) / 2)} y={v.y - (Math.max(0.12, thicknessMap.get(v.id) ?? 0.15) / 2)} width={Math.max(0.12, thicknessMap.get(v.id) ?? 0.15)} height={Math.max(0.12, thicknessMap.get(v.id) ?? 0.15)} fill="#1f2937" listening={false} />
            )}
            {show && (
              <Group entityType="vertex" entityId={v.id} onMouseDown={() => onSelect(v.id, 'vertex')}>
                <Circle x={v.x} y={v.y} radius={vertexHandleRadius} fill={v.locked ? '#f59e0b' : '#0ea5e9'} stroke="#0f172a" strokeWidth={0.01} />
                {v.locked && <LockBadge x={v.x + vertexHandleRadius} y={v.y - vertexHandleRadius * 1.2} />}
              </Group>
            )}
          </Group>
        );
      })}

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
        const w1a = { x: geom.center.x - geom.dir.x * radius * 0.5 + geom.normal.x * 0.03, y: geom.center.y - geom.dir.y * radius * 0.5 + geom.normal.y * 0.03 };
        const w1b = { x: geom.center.x + geom.dir.x * radius * 0.5 + geom.normal.x * 0.03, y: geom.center.y + geom.dir.y * radius * 0.5 + geom.normal.y * 0.03 };
        const w2a = { x: geom.center.x - geom.dir.x * radius * 0.5 - geom.normal.x * 0.03, y: geom.center.y - geom.dir.y * radius * 0.5 - geom.normal.y * 0.03 };
        const w2b = { x: geom.center.x + geom.dir.x * radius * 0.5 - geom.normal.x * 0.03, y: geom.center.y + geom.dir.y * radius * 0.5 - geom.normal.y * 0.03 };
        return (
          <Group key={o.id} entityType="opening" entityId={o.id} onMouseDown={() => onSelect(o.id, 'opening')}>
            {o.type === 'door' ? (
              <>
                <Arc x={geom.center.x} y={geom.center.y} innerRadius={radius - 0.02} outerRadius={radius} angle={90} rotation={geom.angle} stroke="#111827" strokeWidth={0.02} />
                <Line points={[geom.center.x, geom.center.y, geom.center.x + geom.dir.x * radius, geom.center.y + geom.dir.y * radius]} stroke="#111827" strokeWidth={0.02} />
              </>
            ) : (
              <>
                <Line points={[w1a.x, w1a.y, w1b.x, w1b.y]} stroke="#0f766e" strokeWidth={0.02} />
                <Line points={[w2a.x, w2a.y, w2b.x, w2b.y]} stroke="#0f766e" strokeWidth={0.02} />
              </>
            )}
            {o.locked && <LockBadge x={geom.center.x + 0.1} y={geom.center.y - 0.2} />}
          </Group>
        );
      })}

      {wallDraft && <Line points={[wallDraft.start.x, wallDraft.start.y, (wallDraft.end ?? wallDraft.start).x, (wallDraft.end ?? wallDraft.start).y]} stroke="#2563eb" strokeWidth={0.02} dash={[0.1, 0.06]} />}
      {rectDraft && <Line points={flattenPoints([rectDraft.start, { x: rectDraft.end.x, y: rectDraft.start.y }, rectDraft.end, { x: rectDraft.start.x, y: rectDraft.end.y }])} closed stroke="#2563eb" dash={[0.1, 0.1]} strokeWidth={0.02} />}
      {measureDraft?.start && measureDraft?.end && <Line points={[measureDraft.start.x, measureDraft.start.y, measureDraft.end.x, measureDraft.end.y]} stroke="#16a34a" dash={[0.08, 0.08]} strokeWidth={0.02} listening={false} />}
    </Layer>
  );
};

export default KonvaSceneLayer;
