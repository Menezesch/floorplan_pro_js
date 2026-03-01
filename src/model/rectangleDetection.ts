import type { RectangleRoom, Vec2, WallSegment } from './types';
import { nanoid } from 'nanoid';

const EPS = 1e-6;

const samePoint = (a: Vec2, b: Vec2): boolean => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

const axisAligned = (a: Vec2, b: Vec2): boolean => Math.abs(a.x - b.x) < EPS || Math.abs(a.y - b.y) < EPS;

export const detectAxisAlignedRectangle = (walls: WallSegment[]): RectangleRoom | undefined => {
  if (walls.length !== 4) return undefined;
  if (!walls.every((w) => axisAligned(w.p1, w.p2))) return undefined;

  const points = walls.flatMap((w) => [w.p1, w.p2]);
  const unique: Vec2[] = [];
  for (const p of points) {
    if (!unique.some((u) => samePoint(u, p))) unique.push(p);
  }
  if (unique.length !== 4) return undefined;

  const xs = unique.map((p) => p.x);
  const ys = unique.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (maxX - minX < EPS || maxY - minY < EPS) return undefined;

  const requiredCorners: Vec2[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];

  if (!requiredCorners.every((corner) => unique.some((u) => samePoint(u, corner)))) return undefined;

  return {
    id: nanoid(),
    name: 'Room',
    origin: { x: minX, y: minY },
    widthM: maxX - minX,
    heightM: maxY - minY,
    classification: 'internal'
  };
};
