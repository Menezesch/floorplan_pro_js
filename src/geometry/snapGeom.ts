import type { Vec2 } from '../model/types';
import { distance } from './polygonOps';

export interface SnapHit {
  kind: 'vertex' | 'edge' | 'midpoint';
  point: Vec2;
  dist: number;
}

export const nearestVertex = (target: Vec2, vertices: Vec2[]): SnapHit | undefined => {
  let best: SnapHit | undefined;
  for (const v of vertices) {
    const d = distance(target, v);
    if (!best || d < best.dist) best = { kind: 'vertex', point: v, dist: d };
  }
  return best;
};

export const nearestMidpoint = (target: Vec2, segments: [Vec2, Vec2][]): SnapHit | undefined => {
  let best: SnapHit | undefined;
  for (const [a, b] of segments) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const d = distance(target, mid);
    if (!best || d < best.dist) best = { kind: 'midpoint', point: mid, dist: d };
  }
  return best;
};

export const nearestPointOnSegments = (target: Vec2, segments: [Vec2, Vec2][]): SnapHit | undefined => {
  let best: SnapHit | undefined;
  for (const [a, b] of segments) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((target.x - a.x) * abx + (target.y - a.y) * aby) / (abx ** 2 + aby ** 2 || 1)));
    const p = { x: a.x + abx * t, y: a.y + aby * t };
    const d = distance(target, p);
    if (!best || d < best.dist) best = { kind: 'edge', point: p, dist: d };
  }
  return best;
};
