import { Layer, Line } from 'react-konva';
import type { Project } from '../../model/types';

interface Props {
  project: Project;
  selectedId?: string;
  onSelect: (id?: string) => void;
}

const flattenPoints = (points: { x: number; y: number }[]) => points.flatMap((p) => [p.x, p.y]);

const KonvaSceneLayer = ({ project, selectedId, onSelect }: Props) => (
  <Layer>
    {project.rooms.map((room) => (
      <Line
        key={room.id}
        points={flattenPoints(room.boundary)}
        closed
        fill="#dbeafe66"
        stroke="#1d4ed8"
        strokeWidth={0.02}
        onMouseDown={() => onSelect(room.id)}
      />
    ))}
    {project.walls.map((wall) => (
      <Line
        key={wall.id}
        points={flattenPoints(wall.polygon)}
        closed
        fill={selectedId === wall.id ? '#2563eb' : '#1f2937'}
        opacity={0.9}
        onMouseDown={() => onSelect(wall.id)}
      />
    ))}
    {project.obstacles.map((obs) => (
      <Line
        key={obs.id}
        points={flattenPoints(obs.polygon)}
        closed
        fill="#f9731688"
        stroke="#ea580c"
        strokeWidth={0.02}
        dash={[0.08, 0.06]}
        onMouseDown={() => onSelect(obs.id)}
      />
    ))}
  </Layer>
);

export default KonvaSceneLayer;
