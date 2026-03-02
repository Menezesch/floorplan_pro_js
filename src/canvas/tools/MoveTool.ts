import { pickNearestEdge, projectPointOnSegment } from '../../geometry/edgePick';
import type { ToolEventHandlers } from './shared';

export const createMoveToolHandlers = (): ToolEventHandlers => {
  let dragStart: { x: number; y: number } | null = null;
  let dragEntity: { kind: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening' | 'divider' | 'symbol'; id: string } | null = null;

  return {
    onPointerDown: (ctx, actions) => {
      const toleranceM = 12 / Math.max(1e-6, ctx.pixelsPerMeter);
      const nearestEdge = pickNearestEdge(ctx.project, ctx.rawWorld, toleranceM);
      if (ctx.hit.kind === 'edge' && nearestEdge?.edgeId) {
        actions.setSelected(nearestEdge.edgeId, 'edge');
        dragStart = ctx.snapped.point;
        dragEntity = { kind: 'edge', id: nearestEdge.edgeId };
        return;
      }
      if (ctx.hit.id && ctx.hit.kind !== 'none') {
        actions.setSelected(ctx.hit.id, ctx.hit.kind);
        dragStart = ctx.snapped.point;
        dragEntity = { kind: ctx.hit.kind as Exclude<typeof ctx.hit.kind, 'none'>, id: ctx.hit.id };
      } else if (nearestEdge?.edgeId) {
        actions.setSelected(nearestEdge.edgeId, 'edge');
        dragStart = ctx.snapped.point;
        dragEntity = { kind: 'edge', id: nearestEdge.edgeId };
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
        const seg = projectPointOnSegment(ctx.rawWorld, wall.points[0], wall.points[1]);
        actions.moveOpeningAlongWall(dragEntity.id, seg.distanceAlongM);
        return;
      }
      const delta = { x: ctx.snapped.point.x - dragStart.x, y: ctx.snapped.point.y - dragStart.y };
      if (Math.abs(delta.x) < 1e-9 && Math.abs(delta.y) < 1e-9) return;
      if (dragEntity.kind === 'vertex') actions.moveVertex(dragEntity.id, delta);
      if (dragEntity.kind === 'edge') actions.moveEdge(dragEntity.id, delta);
      if (dragEntity.kind === 'room') actions.moveRoom(dragEntity.id, delta);
      if (dragEntity.kind === 'obstacle') actions.moveObstacle(dragEntity.id, delta);
      if (dragEntity.kind === 'divider') actions.moveRoomDivider(dragEntity.id, delta);
      if (dragEntity.kind === 'symbol') actions.moveFloorSymbol(dragEntity.id, delta);
      dragStart = ctx.snapped.point;
    },
    onPointerUp: () => {
      dragStart = null;
      dragEntity = null;
    }
  };
};
