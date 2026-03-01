import type { Vec2 } from '../model/types';

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const polygonArea = (pts: Vec2[]): number => {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum / 2);
};

export const polygonPerimeter = (pts: Vec2[]): number =>
  pts.reduce((acc, p, idx) => acc + distance(p, pts[(idx + 1) % pts.length]), 0);

export const pointInPolygon = (point: Vec2, poly: Vec2[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + 1e-9) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
};
