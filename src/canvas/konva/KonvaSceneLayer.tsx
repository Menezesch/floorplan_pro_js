import { Arc, Circle, Group, Layer, Line, Rect, Text } from 'react-konva';
import type { FloorSymbol, Opening, Project, RoomDivider, Vec2, Wall, WallEdge } from '../../model/types';
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
  selectedKind?: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening' | 'divider' | 'symbol';
  activeTool: string;
  hoveredVertexId?: string;
  vertexHandleRadius: number;
  wallDraft?: { start: Vec2; end?: Vec2 };
  dividerDraft?: { start: Vec2; end?: Vec2 } | null;
  rectDraft?: RectDraft | null;
  measureDraft?: { start?: Vec2; end?: Vec2 };
  onSelect: (id?: string, kind?: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening' | 'divider' | 'symbol') => void;
}

const flattenPoints = (points: { x: number; y: number }[]) => points.flatMap((p) => [p.x, p.y]);
const wallInsetForThickness = (thicknessM: number) => Math.max(0.01, Math.min(0.03, thicknessM * 0.3));

// ── Miter join helpers ────────────────────────────────────────────────────────
const perpCCW = (dx: number, dy: number, len: number): [number, number] => {
  const l = len || 1;
  return [-(dy / l), dx / l];
};

const computeMiterAt = (
  edge: WallEdge,
  vertexId: string,
  vertexEdgeMap: Map<string, WallEdge[]>,
  vById: Map<string, Vec2>,
  thicknessOverride?: number
): { left: Vec2; right: Vec2 } | null => {
  const edges = vertexEdgeMap.get(vertexId) ?? [];
  if (edges.length !== 2) return null;
  const other = edges.find((e) => e.id !== edge.id);
  if (!other) return null;

  const va = vById.get(edge.v1Id);
  const vb = vById.get(edge.v2Id);
  const oa = vById.get(other.v1Id);
  const ob = vById.get(other.v2Id);
  if (!va || !vb || !oa || !ob) return null;

  const dx1 = vb.x - va.x, dy1 = vb.y - va.y;
  const len1 = Math.hypot(dx1, dy1) || 1;
  const [n1x, n1y] = perpCCW(dx1, dy1, len1);

  const dx2 = ob.x - oa.x, dy2 = ob.y - oa.y;
  const len2 = Math.hypot(dx2, dy2) || 1;
  const [n2x, n2y] = perpCCW(dx2, dy2, len2);

  const bx = n1x + n2x;
  const by = n1y + n2y;
  const blen = Math.hypot(bx, by);
  if (blen < 0.001) return null; // (anti)parallel edges — no miter needed

  const bisX = bx / blen;
  const bisY = by / blen;
  const denom = bisX * n1x + bisY * n1y;
  if (Math.abs(denom) < 0.01) return null;

  const T = thicknessOverride ?? edge.thicknessM;
  let mLen = (T / 2) / denom;
  const cap = T * 5;
  if (Math.abs(mLen) > cap) mLen = Math.sign(mLen) * cap;

  const v = vById.get(vertexId)!;
  return {
    left: { x: v.x + bisX * mLen, y: v.y + bisY * mLen },
    right: { x: v.x - bisX * mLen, y: v.y - bisY * mLen }
  };
};

const miteredPolygon = (
  edge: WallEdge,
  s: Vec2,
  e: Vec2,
  wall: Wall,
  vertexEdgeMap: Map<string, WallEdge[]>,
  vById: Map<string, Vec2>,
  thickness: number
): Vec2[] => {
  const base = wallSegmentToPolygon(s, e, thickness);
  const atWallStart = Math.hypot(s.x - wall.points[0].x, s.y - wall.points[0].y) < 1e-5;
  const atWallEnd = Math.hypot(e.x - wall.points[1].x, e.y - wall.points[1].y) < 1e-5;
  const mV1 = atWallStart ? computeMiterAt(edge, edge.v1Id, vertexEdgeMap, vById, thickness) : null;
  const mV2 = atWallEnd ? computeMiterAt(edge, edge.v2Id, vertexEdgeMap, vById, thickness) : null;
  return [
    mV1 ? mV1.left : base[0],
    mV2 ? mV2.left : base[1],
    mV2 ? mV2.right : base[2],
    mV1 ? mV1.right : base[3]
  ];
};

// ── Opening gap helpers ───────────────────────────────────────────────────────
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

const edgeSegmentsWithGaps = (wall: Wall, openings: Opening[], skipGaps: boolean): [Vec2, Vec2][] => {
  const [a, b] = wall.points;
  const len = measureDistance(a, b);
  if (len < 1e-6) return [];
  if (skipGaps) return [[a, b]];
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

// ── Symbol label abbreviations ────────────────────────────────────────────────
const SYMBOL_LABELS: Record<string, string> = {
  chair: 'CHR', table: 'TBL', sofa: 'SOF', bed: 'BED',
  sink: 'SNK', toilet: 'WC', bathtub: 'BTH', desk: 'DSK'
};

const LockBadge = ({ x, y }: { x: number; y: number }) => <Text x={x} y={y} text="🔒" fontSize={0.5} fill="#334155" listening={false} />;

const KonvaSceneLayer = ({ project, selectedId, selectedKind, activeTool, hoveredVertexId, vertexHandleRadius, wallDraft, dividerDraft, rectDraft, measureDraft, onSelect }: Props) => {
  // Degree map for junction rendering
  const degreeMap = new Map<string, number>();
  const thicknessMap = new Map<string, number>();
  for (const e of project.wallEdges) {
    degreeMap.set(e.v1Id, (degreeMap.get(e.v1Id) ?? 0) + 1);
    degreeMap.set(e.v2Id, (degreeMap.get(e.v2Id) ?? 0) + 1);
    thicknessMap.set(e.v1Id, Math.max(thicknessMap.get(e.v1Id) ?? 0, e.thicknessM));
    thicknessMap.set(e.v2Id, Math.max(thicknessMap.get(e.v2Id) ?? 0, e.thicknessM));
  }

  // Miter precomputation (Item 15)
  const vertexEdgeMap = new Map<string, WallEdge[]>();
  for (const e of project.wallEdges) {
    if (!vertexEdgeMap.has(e.v1Id)) vertexEdgeMap.set(e.v1Id, []);
    if (!vertexEdgeMap.has(e.v2Id)) vertexEdgeMap.set(e.v2Id, []);
    vertexEdgeMap.get(e.v1Id)!.push(e);
    vertexEdgeMap.get(e.v2Id)!.push(e);
  }
  const vById = new Map<string, Vec2>(project.wallVertices.map((v) => [v.id, { x: v.x, y: v.y }]));

  return (
    <Layer>
      {/* Origin crosshair */}
      <Line points={[-100, 0, 100, 0]} stroke="#ef4444" strokeWidth={0.01} listening={false} />
      <Line points={[0, -100, 0, 100]} stroke="#ef4444" strokeWidth={0.01} listening={false} />
      <Circle x={0} y={0} radius={0.08} fill="#ef4444" listening={false} />

      {/* ── Rooms ───────────────────────────────────────────────────────── */}
      {project.rooms.map((room) => (
        <Group key={room.id} entityType="room" entityId={room.id} onMouseDown={() => onSelect(room.id, 'room')}>
          <Line points={flattenPoints(room.boundary)} closed fill={selectedId === room.id && selectedKind === 'room' ? '#dbeafe' : '#f0f9ff'} stroke="#93c5fd" strokeWidth={0.015} opacity={0.6} listening />
          {room.label && <Text x={room.label.x} y={room.label.y} text={room.name} fontSize={0.22} fill="#1e40af" offsetX={0} offsetY={0} listening={false} />}
          {room.locked && room.origin && <LockBadge x={room.origin.x} y={(room.origin.y ?? 0) - 0.4} />}
        </Group>
      ))}

      {/* ── Walls (with miter joins) ─────────────────────────────────────── */}
      {project.walls.map((wall) => {
        const wallEdge = project.wallEdges.find((e) => e.id === wall.id);
        const edgeOpenings = project.openings.filter((o) => o.wallId === wall.id);

        // Item 17: suppress gaps if both endpoints have degree ≥ 2 (closed shape)
        const inClosedShape = wallEdge
          ? (degreeMap.get(wallEdge.v1Id) ?? 0) >= 2 && (degreeMap.get(wallEdge.v2Id) ?? 0) >= 2
          : false;

        const segments = edgeSegmentsWithGaps(wall, edgeOpenings, inClosedShape);
        return (
          <Group key={wall.id}>
            {segments.map(([s, e], i) => {
              const inset = wallInsetForThickness(wall.thicknessM);
              const innerT = wall.thicknessM - inset * 2;

              // Item 15: mitered polygon at wall endpoints
              const outer = wallEdge
                ? miteredPolygon(wallEdge, s, e, wall, vertexEdgeMap, vById, wall.thicknessM)
                : wallSegmentToPolygon(s, e, wall.thicknessM);
              const inner = innerT > 0.01
                ? (wallEdge ? miteredPolygon(wallEdge, s, e, wall, vertexEdgeMap, vById, innerT) : wallSegmentToPolygon(s, e, innerT))
                : undefined;

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

      {/* Item 26: Water wall pipe decorations */}
      {project.walls.map((wall) => {
        const wallEdge = project.wallEdges.find((e) => e.id === wall.id);
        if (!wallEdge?.isWaterWall) return null;
        const [a, b] = wall.points;
        const len = measureDistance(a, b);
        if (len < 1e-6) return null;
        const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
        const spacing = 0.35;
        const count = Math.max(1, Math.floor(len / spacing));
        const dots: Vec2[] = [];
        for (let i = 0; i <= count; i++) {
          const t = (i / count) * len;
          dots.push({ x: a.x + dir.x * t, y: a.y + dir.y * t });
        }
        return (
          <Group key={`water-${wall.id}`} listening={false}>
            {dots.map((pt, i) => (
              <Circle key={i} x={pt.x} y={pt.y} radius={0.04} fill="#0ea5e9" opacity={0.8} />
            ))}
          </Group>
        );
      })}

      {/* ── Wall vertices / junction fills ──────────────────────────────── */}
      {project.wallVertices.map((v) => {
        const degree = degreeMap.get(v.id) ?? 0;
        const show = activeTool === 'move' || hoveredVertexId === v.id || (selectedKind === 'vertex' && selectedId === v.id) || (selectedKind === 'edge' && project.wallEdges.some((e) => e.id === selectedId && (e.v1Id === v.id || e.v2Id === v.id)));
        return (
          <Group key={v.id}>
            {/* Junction square only for degree ≥ 3 (T/X junctions); degree-2 corners use miter */}
            {degree >= 3 && (() => {
              const t = thicknessMap.get(v.id) ?? 0.15;
              const inset = wallInsetForThickness(t);
              const inner = t - inset * 2;
              return (
                <>
                  <Rect x={v.x - t / 2} y={v.y - t / 2} width={t} height={t} fill="#1f2937" listening={false} />
                  {inner > 0.01 && <Rect x={v.x - inner / 2} y={v.y - inner / 2} width={inner} height={inner} fill="#ffffff" listening={false} />}
                </>
              );
            })()}

            {show && (
              <Group entityType="vertex" entityId={v.id} onMouseDown={() => onSelect(v.id, 'vertex')}>
                <Circle x={v.x} y={v.y} radius={vertexHandleRadius} fill={v.locked ? '#f59e0b' : '#0ea5e9'} stroke="#0f172a" strokeWidth={0.01} />
                {v.locked && <LockBadge x={v.x + vertexHandleRadius} y={v.y - vertexHandleRadius * 1.2} />}
              </Group>
            )}
          </Group>
        );
      })}

      {/* ── Obstacles ───────────────────────────────────────────────────── */}
      {project.obstacles.map((obs) => (
        <Group key={obs.id} entityType="obstacle" entityId={obs.id} onMouseDown={() => onSelect(obs.id, 'obstacle')}>
          <Line points={flattenPoints(obs.polygon)} closed fill="#9ca3af88" stroke="#4b5563" strokeWidth={0.02} dash={[0.08, 0.06]} />
          {obs.locked && obs.origin && <LockBadge x={obs.origin.x} y={obs.origin.y - 0.4} />}
        </Group>
      ))}

      {/* ── Openings (doors / windows) ───────────────────────────────────── */}
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

      {/* ── Room Dividers (Items 5/13) ───────────────────────────────────── */}
      {(project.roomDividers ?? []).map((div: RoomDivider) => {
        const isSelected = selectedId === div.id && selectedKind === 'divider';
        const mx = (div.start.x + div.end.x) / 2;
        const my = (div.start.y + div.end.y) / 2;
        return (
          <Group key={div.id} entityType="divider" entityId={div.id} onMouseDown={() => onSelect(div.id, 'divider')}>
            {/* Invisible wide hit area */}
            <Line points={[div.start.x, div.start.y, div.end.x, div.end.y]} stroke="transparent" strokeWidth={0.25} listening hitStrokeWidth={0.25} />
            {/* Visible dashed line */}
            <Line
              points={[div.start.x, div.start.y, div.end.x, div.end.y]}
              stroke={isSelected ? '#2563eb' : '#64748b'}
              strokeWidth={0.03}
              dash={[0.15, 0.08]}
              listening={false}
            />
            {div.name && (
              <Text
                x={mx}
                y={my - 0.13}
                text={div.name}
                fontSize={0.18}
                fill={isSelected ? '#1d4ed8' : '#475569'}
                offsetX={div.name.length * 0.05}
                listening={false}
              />
            )}
            {div.locked && <LockBadge x={div.start.x} y={div.start.y - 0.35} />}
          </Group>
        );
      })}

      {/* ── Floor Symbols (Item 12) ──────────────────────────────────────── */}
      {(project.floorSymbols ?? []).map((sym: FloorSymbol) => {
        const isSelected = selectedId === sym.id && selectedKind === 'symbol';
        const label = SYMBOL_LABELS[sym.type] ?? sym.type.slice(0, 3).toUpperCase();
        const hw = sym.widthM / 2;
        const hh = sym.heightM / 2;
        return (
          <Group
            key={sym.id}
            x={sym.position.x}
            y={sym.position.y}
            rotation={sym.rotation}
            entityType="symbol"
            entityId={sym.id}
            onMouseDown={() => onSelect(sym.id, 'symbol')}
          >
            <Rect
              x={-hw}
              y={-hh}
              width={sym.widthM}
              height={sym.heightM}
              fill={isSelected ? '#dbeafe' : '#e5e7eb'}
              stroke={isSelected ? '#2563eb' : '#6b7280'}
              strokeWidth={0.02}
              cornerRadius={0.04}
            />
            <Text
              x={-hw}
              y={-0.09}
              width={sym.widthM}
              text={label}
              fontSize={0.18}
              fill={isSelected ? '#1d4ed8' : '#374151'}
              align="center"
              listening={false}
            />
            {sym.locked && <LockBadge x={hw + 0.05} y={-hh - 0.1} />}
          </Group>
        );
      })}

      {/* ── Drafts ──────────────────────────────────────────────────────── */}
      {wallDraft && <Line points={[wallDraft.start.x, wallDraft.start.y, (wallDraft.end ?? wallDraft.start).x, (wallDraft.end ?? wallDraft.start).y]} stroke="#2563eb" strokeWidth={0.02} dash={[0.1, 0.06]} />}
      {dividerDraft && (
        <Line
          points={[dividerDraft.start.x, dividerDraft.start.y, (dividerDraft.end ?? dividerDraft.start).x, (dividerDraft.end ?? dividerDraft.start).y]}
          stroke="#7c3aed"
          strokeWidth={0.03}
          dash={[0.15, 0.08]}
        />
      )}
      {rectDraft && <Line points={flattenPoints([rectDraft.start, { x: rectDraft.end.x, y: rectDraft.start.y }, rectDraft.end, { x: rectDraft.start.x, y: rectDraft.end.y }])} closed stroke="#2563eb" dash={[0.1, 0.1]} strokeWidth={0.02} />}
      {measureDraft?.start && measureDraft?.end && <Line points={[measureDraft.start.x, measureDraft.start.y, measureDraft.end.x, measureDraft.end.y]} stroke="#16a34a" dash={[0.08, 0.08]} strokeWidth={0.02} listening={false} />}
    </Layer>
  );
};

export default KonvaSceneLayer;
