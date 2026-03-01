import { Arc, Group, Layer, Line } from 'react-konva';
import type { Project, Vec2 } from '../../model/types';
import { measureDistance } from '../../geometry/measure';

interface RectDraft {
  start: Vec2;
  end: Vec2;
  kind: 'roomRect' | 'obstacle';
}

interface Props {
  project: Project;
  selectedId?: string;
  wallDraft?: { start: Vec2; end?: Vec2 };
  rectDraft?: RectDraft | null;
  onSelect: (id?: string) => void;
}

const flattenPoints = (points: { x: number; y: number }[]) => points.flatMap((p) => [p.x, p.y]);

const openingGeometry = (project: Project, openingId: string) => {
  const opening = project.openings.find((o) => o.id === openingId);
  if (!opening) return undefined;
  const wall = project.walls.find((w) => w.id === opening.wallId);
  if (!wall) return undefined;
  const [a, b] = wall.points;
  const len = Math.max(1e-6, measureDistance(a, b));
  const t = Math.max(0, Math.min(1, opening.distanceAlongM / len));
  const center = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { opening, center, angle };
};

const KonvaSceneLayer = ({ project, selectedId, wallDraft, rectDraft, onSelect }: Props) => (
  <Layer>
    {project.rooms.map((room) => (
      <Line key={room.id} points={flattenPoints(room.boundary)} closed fill="#dbeafe66" stroke="#1d4ed8" strokeWidth={0.02} entityType="room" entityId={room.id} onMouseDown={() => onSelect(room.id)} />
    ))}
    {project.walls.map((wall) => (
      <Line key={wall.id} points={flattenPoints(wall.polygon)} closed fill={selectedId === wall.id ? '#2563eb' : '#1f2937'} opacity={0.9} entityType="wall" entityId={wall.id} onMouseDown={() => onSelect(wall.id)} />
    ))}
    {project.obstacles.map((obs) => (
      <Line key={obs.id} points={flattenPoints(obs.polygon)} closed fill="#9ca3af88" stroke="#4b5563" strokeWidth={0.02} dash={[0.08, 0.06]} entityType="obstacle" entityId={obs.id} onMouseDown={() => onSelect(obs.id)} />
    ))}
    {project.openings.map((o) => {
      const geom = openingGeometry(project, o.id);
      if (!geom) return null;
      const radius = Math.max(0.2, geom.opening.widthM / 2);
      return (
        <Group key={o.id} entityType="opening" entityId={o.id} onMouseDown={() => onSelect(o.id)}>
          {geom.opening.type === 'door' ? (
            <>
              <Arc x={geom.center.x} y={geom.center.y} innerRadius={radius - 0.02} outerRadius={radius} angle={90} rotation={geom.angle} stroke="#111827" strokeWidth={0.02} entityType="opening" entityId={o.id} />
              <Line points={[geom.center.x, geom.center.y, geom.center.x + Math.cos((geom.angle * Math.PI) / 180) * radius, geom.center.y + Math.sin((geom.angle * Math.PI) / 180) * radius]} stroke="#111827" strokeWidth={0.02} entityType="opening" entityId={o.id} />
            </>
          ) : (
            <>
              <Line points={[geom.center.x - radius * 0.5, geom.center.y - 0.03, geom.center.x + radius * 0.5, geom.center.y - 0.03]} stroke="#0f766e" strokeWidth={0.02} entityType="opening" entityId={o.id} />
              <Line points={[geom.center.x - radius * 0.5, geom.center.y + 0.03, geom.center.x + radius * 0.5, geom.center.y + 0.03]} stroke="#0f766e" strokeWidth={0.02} entityType="opening" entityId={o.id} />
            </>
          )}
        </Group>
      );
    })}
    {wallDraft && <Line points={[wallDraft.start.x, wallDraft.start.y, (wallDraft.end ?? wallDraft.start).x, (wallDraft.end ?? wallDraft.start).y]} stroke="#2563eb" strokeWidth={0.02} dash={[0.1, 0.06]} />}
    {rectDraft && (
      <Line
        points={flattenPoints([rectDraft.start, { x: rectDraft.end.x, y: rectDraft.start.y }, rectDraft.end, { x: rectDraft.start.x, y: rectDraft.end.y }])}
        closed
        stroke={rectDraft.kind === 'roomRect' ? '#2563eb' : '#4b5563'}
        dash={[0.1, 0.1]}
        strokeWidth={0.02}
      />
    )}
  </Layer>
);

export default KonvaSceneLayer;
