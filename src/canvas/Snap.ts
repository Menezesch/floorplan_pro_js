import type { Project, SnapState, Vec2 } from '../model/types';
import { nearestMidpoint, nearestPointOnSegments, nearestVertex } from '../geometry/snapGeom';

export interface SnapResult {
  point: Vec2;
  kind: 'vertex' | 'edge' | 'midpoint' | 'grid' | 'none';
  label: 'V' | 'E' | 'M' | 'G' | '';
}

const collectSegments = (project: Project): [Vec2, Vec2][] => {
  const byId = new Map(project.wallVertices.map((v) => [v.id, v]));
  return project.wallEdges.flatMap((edge) => {
    const a = byId.get(edge.v1Id);
    const b = byId.get(edge.v2Id);
    if (!a || !b) return [];
    return [[{ x: a.x, y: a.y }, { x: b.x, y: b.y }] as [Vec2, Vec2]];
  });
};

const gridSnap = (point: Vec2, gridM: number): Vec2 => ({
  x: Math.round(point.x / gridM) * gridM,
  y: Math.round(point.y / gridM) * gridM
});

export const applySnapping = (point: Vec2, project: Project, snap: SnapState, gridM: number, pixelsPerMeter: number, tolerancePx = 10): SnapResult => {
  const toleranceM = tolerancePx / Math.max(1e-6, pixelsPerMeter);
  const vertices = project.wallVertices.map((v) => ({ x: v.x, y: v.y }));
  const segs = collectSegments(project);

  if (snap.vertex) {
    const hit = nearestVertex(point, vertices);
    if (hit && hit.dist <= toleranceM) return { point: hit.point, kind: 'vertex', label: 'V' };
  }

  if (snap.edge) {
    const hit = nearestPointOnSegments(point, segs);
    if (hit && hit.dist <= toleranceM) return { point: hit.point, kind: 'edge', label: 'E' };
  }

  if (snap.midpoint) {
    const hit = nearestMidpoint(point, segs);
    if (hit && hit.dist <= toleranceM) return { point: hit.point, kind: 'midpoint', label: 'M' };
  }

  if (snap.grid) {
    const stepped = gridSnap(point, Math.max(0.05, gridM));
    return { point: stepped, kind: 'grid', label: 'G' };
  }

  return { point, kind: 'none', label: '' };
};
