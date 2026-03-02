import { measureDistance } from '../../geometry/measure';
import type { ToolEventHandlers } from './shared';

export const createDividerToolHandlers = (): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    const current = actions.getDividerDraft();
    if (!current) {
      actions.setDividerDraft(ctx.snapped.point, ctx.snapped.point);
      return;
    }
    const len = measureDistance(current.start, ctx.snapped.point);
    if (len < 0.01) {
      actions.setDividerDraft(null);
      actions.setPreviewLabel(null);
      return;
    }
    actions.addRoomDivider(current.start, ctx.snapped.point, 'Zone');
    actions.setDividerDraft(null);
    actions.setPreviewLabel(null);
  },
  onPointerMove: (ctx, actions) => {
    const current = actions.getDividerDraft();
    if (!current) return;
    actions.setDividerDraft(current.start, ctx.snapped.point);
    const len = measureDistance(current.start, ctx.snapped.point);
    actions.setPreviewLabel(`${len.toFixed(2)} m`, ctx.snapped.point);
  },
  onKeyDown: (e, actions) => {
    if (e.key === 'Escape') {
      actions.setDividerDraft(null);
      actions.setPreviewLabel(null);
    }
  }
});
