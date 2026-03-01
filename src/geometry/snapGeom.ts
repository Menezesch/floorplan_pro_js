import type { Vec2 } from '../model/types';

export interface SnapHit {
  kind: 'vertex' | 'grid';
  point: Vec2;
  dist: number;
}

const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const nearestVertex = (target: Vec2, vertices: Vec2[]): SnapHit | undefined => {
  let best: SnapHit | undefined;
  for (const vertex of vertices) {
    const d = dist(target, vertex);
    if (!best || d < best.dist) {
      best = { kind: 'vertex', point: vertex, dist: d };
    }
  }
  return best;
};

export const snapToGrid = (target: Vec2, gridSizeM: number): SnapHit => {
  const point = {
    x: Math.round(target.x / gridSizeM) * gridSizeM,
    y: Math.round(target.y / gridSizeM) * gridSizeM
  };
  return { kind: 'grid', point, dist: dist(target, point) };
};
