import { measureDistance } from '../../geometry/measure';
import type { Opening, Wall } from '../../model/types';
import type { ToolEventHandlers } from './shared';

const projectPointOnWall = (point: { x: number; y: number }, wall: Wall) => {
  const [a, b] = wall.points;
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx ** 2 + aby ** 2;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / (len2 || 1)));
  const p = { x: a.x + abx * t, y: a.y + aby * t };
  const len = measureDistance(a, b);
  return { point: p, distanceAlongM: t * len };
};

export const createOpeningToolHandlers = (type: Opening['type']): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    const wallId = ctx.hit.kind === 'wall' ? ctx.hit.id : ctx.selectedId;
    const wall = wallId ? ctx.project.walls.find((w) => w.id === wallId) : undefined;
    if (!wall) return;
    const projected = projectPointOnWall(ctx.snapped.point, wall);
    const openingId = actions.addOpeningToWall(wall.id, type, projected.distanceAlongM, type === 'door' ? 0.9 : 1.2);
    if (openingId) actions.setSelected(openingId);
  }
});
