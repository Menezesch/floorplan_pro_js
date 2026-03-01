import { measureDistance } from '../../geometry/measure';
import type { Wall } from '../../model/types';
import type { ToolEventHandlers } from './shared';

const projectPointOnWall = (point: { x: number; y: number }, wall: Wall) => {
  const [a, b] = wall.points;
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx ** 2 + aby ** 2;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / (len2 || 1)));
  const len = measureDistance(a, b);
  return t * len;
};

export const createMoveToolHandlers = (): ToolEventHandlers => {
  let dragStart: { x: number; y: number } | null = null;
  let dragEntity: { kind: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening'; id: string } | null = null;

  return {
    onPointerDown: (ctx, actions) => {
      if (ctx.hit.id && ctx.hit.kind !== 'none') {
        actions.setSelected(ctx.hit.id, ctx.hit.kind);
        dragStart = ctx.snapped.point;
        dragEntity = { kind: ctx.hit.kind, id: ctx.hit.id };
      } else {
        actions.setSelected(undefined);
        dragStart = null;
        dragEntity = null;
      }
    },
    onPointerMove: (ctx, actions) => {
      if (!dragStart || !dragEntity) return;
      if (dragEntity.kind === 'opening') {
        const opening = ctx.project.openings.find((o) => o.id === dragEntity?.id);
        const wall = opening ? ctx.project.walls.find((w) => w.id === opening.wallId) : undefined;
        if (!wall) return;
        actions.moveOpeningAlongWall(dragEntity.id, projectPointOnWall(ctx.snapped.point, wall));
        return;
      }
      const delta = { x: ctx.snapped.point.x - dragStart.x, y: ctx.snapped.point.y - dragStart.y };
      if (Math.abs(delta.x) < 1e-9 && Math.abs(delta.y) < 1e-9) return;
      if (dragEntity.kind === 'vertex') actions.moveVertex(dragEntity.id, delta);
      if (dragEntity.kind === 'edge') actions.moveEdge(dragEntity.id, delta);
      if (dragEntity.kind === 'room') actions.moveRoom(dragEntity.id, delta);
      if (dragEntity.kind === 'obstacle') actions.moveObstacle(dragEntity.id, delta);
      dragStart = ctx.snapped.point;
    },
    onPointerUp: () => {
      dragStart = null;
      dragEntity = null;
    }
  };
};
