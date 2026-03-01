import type { ToolEventHandlers } from './shared';

export const createRoomRectToolHandlers = (): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    actions.setRectDraft(ctx.snapped.point, ctx.snapped.point, 'roomRect');
    actions.setPreviewLabel(null);
  },
  onPointerMove: (ctx, actions) => {
    const draft = actions.getRectDraft();
    if (!draft || draft.kind !== 'roomRect') return;
    actions.setRectDraft(draft.start, ctx.snapped.point, 'roomRect');
    const width = Math.abs(ctx.snapped.point.x - draft.start.x);
    const height = Math.abs(ctx.snapped.point.y - draft.start.y);
    actions.setPreviewLabel(`${width.toFixed(2)}m × ${height.toFixed(2)}m`, ctx.snapped.point);
  },
  onPointerUp: (_ctx, actions) => {
    const draft = actions.getRectDraft();
    if (!draft || draft.kind !== 'roomRect') return;
    const minX = Math.min(draft.start.x, draft.end.x);
    const maxX = Math.max(draft.start.x, draft.end.x);
    const minY = Math.min(draft.start.y, draft.end.y);
    const maxY = Math.max(draft.start.y, draft.end.y);
    const p1 = { x: minX, y: minY };
    const p2 = { x: maxX, y: minY };
    const p3 = { x: maxX, y: maxY };
    const p4 = { x: minX, y: maxY };
    actions.addWallSegment(p1, p2, 0.15);
    actions.addWallSegment(p2, p3, 0.15);
    actions.addWallSegment(p3, p4, 0.15);
    actions.addWallSegment(p4, p1, 0.15);
    actions.setRectDraft(null, null, null);
    actions.setPreviewLabel(null);
  },
  onKeyDown: (e, actions) => {
    if (e.key === 'Escape') {
      actions.setRectDraft(null, null, null);
      actions.setPreviewLabel(null);
    }
  }
});
