import type { Vec2 } from '../model/types';

export const measureDistance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
