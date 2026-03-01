import type { Project, Vec2 } from '../model/types';

export interface EdgePick {
  edgeId: string;
  distanceM: number;
  projectedPoint: Vec2;
  distanceAlongM: number;
}

export const projectPointOnSegment = (point: Vec2, a: Vec2, b: Vec2) => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx ** 2 + aby ** 2;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / (len2 || 1)));
  const projectedPoint = { x: a.x + abx * t, y: a.y + aby * t };
  const distanceM = Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y);
  const length = Math.hypot(abx, aby);
  return { t, projectedPoint, distanceM, distanceAlongM: t * length };
};

export const pickNearestEdge = (project: Project, point: Vec2, toleranceM: number): EdgePick | undefined => {
  const byId = new Map(project.wallVertices.map((v) => [v.id, v]));
  let best: EdgePick | undefined;

  for (const edge of project.wallEdges) {
    const v1 = byId.get(edge.v1Id);
    const v2 = byId.get(edge.v2Id);
    if (!v1 || !v2) continue;
    const seg = projectPointOnSegment(point, { x: v1.x, y: v1.y }, { x: v2.x, y: v2.y });
    if (seg.distanceM > toleranceM) continue;
    if (!best || seg.distanceM < best.distanceM) {
      best = {
        edgeId: edge.id,
        distanceM: seg.distanceM,
        projectedPoint: seg.projectedPoint,
        distanceAlongM: seg.distanceAlongM
      };
    }
  }

  return best;
};
