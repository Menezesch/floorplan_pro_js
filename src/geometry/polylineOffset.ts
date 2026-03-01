import type { Vec2 } from '../model/types';

export const wallSegmentToPolygon = (a: Vec2, b: Vec2, thicknessM: number): Vec2[] => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -(dy / len) * (thicknessM / 2);
  const ny = (dx / len) * (thicknessM / 2);
  return [
    { x: a.x + nx, y: a.y + ny },
    { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny },
    { x: a.x - nx, y: a.y - ny }
  ];
};
