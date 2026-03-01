import type { Project, SnapState, Vec2 } from '../model/types';
import { nearestVertex, snapToGrid } from '../geometry/snapGeom';

export interface SnapContext {
  metersPerPixel: number;
}

export interface SnapResult {
  point: Vec2;
  active?: SnapState['active'];
}

export const collectVertices = (project: Project): Vec2[] => [
  ...project.walls.flatMap((wall) => [wall.p1, wall.p2]),
  ...project.rooms.flatMap((room) => {
    const x = room.origin.x;
    const y = room.origin.y;
    const w = room.widthM;
    const h = room.heightM;
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h }
    ];
  }),
  ...project.obstacles.flatMap((obs) => obs.polygon)
];

export const applySnapping = (
  point: Vec2,
  project: Project,
  snap: SnapState,
  context: SnapContext
): SnapResult => {
  const thresholdM = project.settings.snapThresholdPx * context.metersPerPixel;
  const candidates: Array<{ point: Vec2; active: SnapState['active']; dist: number }> = [];

  if (snap.vertex) {
    const vertexHit = nearestVertex(point, collectVertices(project));
    if (vertexHit && vertexHit.dist <= thresholdM) {
      candidates.push({ point: vertexHit.point, active: 'vertex', dist: vertexHit.dist });
    }
  }

  if (snap.grid) {
    const gridHit = snapToGrid(point, project.settings.gridSizeM);
    candidates.push({ point: gridHit.point, active: 'grid', dist: gridHit.dist });
  }

  if (candidates.length === 0) {
    return { point };
  }

  candidates.sort((a, b) => a.dist - b.dist);
  return { point: candidates[0].point, active: candidates[0].active };
};
