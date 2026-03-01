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
    actions.addRoomRect(draft.start, draft.end);
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
