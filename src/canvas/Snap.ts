import type { Project, SnapState, Vec2 } from '../model/types';
import { nearestMidpoint, nearestPointOnSegments, nearestVertex } from '../geometry/snapGeom';

const collectSegments = (project: Project): [Vec2, Vec2][] => {
  const result: [Vec2, Vec2][] = [];
  for (const wall of project.walls) {
    for (let i = 0; i < wall.points.length - 1; i += 1) result.push([wall.points[i], wall.points[i + 1]]);
  }
  return result;
};

export const applySnapping = (point: Vec2, project: Project, snap: SnapState, gridM: number): Vec2 => {
  const vertices = project.walls.flatMap((w) => w.points);
  const segs = collectSegments(project);
  const hits = [];
  if (snap.vertex) {
    const h = nearestVertex(point, vertices);
    if (h) hits.push(h);
  }
  if (snap.edge) {
    const h = nearestPointOnSegments(point, segs);
    if (h) hits.push(h);
  }
  if (snap.midpoint) {
    const h = nearestMidpoint(point, segs);
    if (h) hits.push(h);
  }
  if (hits.length > 0) return hits.sort((a, b) => a.dist - b.dist)[0].point;
  if (snap.grid) return { x: Math.round(point.x / gridM) * gridM, y: Math.round(point.y / gridM) * gridM };
  return point;
};
