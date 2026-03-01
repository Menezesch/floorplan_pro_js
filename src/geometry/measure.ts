import type { Vec2, WallSegment } from '../model/types';

export const measureDistance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const wallLengthM = (wall: WallSegment): number => measureDistance(wall.p1, wall.p2);
