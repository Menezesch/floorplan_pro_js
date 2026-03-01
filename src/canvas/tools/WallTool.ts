import { measureDistance } from '../../geometry/measure';
import type { ToolEventHandlers } from './shared';

export const createWallToolHandlers = (): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    const current = actions.getWallDraft();
    if (!current) {
      actions.setWallDraft(ctx.snapped.point, ctx.snapped.point);
      return;
    }

    const len = measureDistance(current.start, ctx.snapped.point);
    if (len < 0.01) {
      actions.setWallDraft(null);
      actions.setPreviewLabel(null);
      return;
    }

    actions.addWallSegment(current.start, ctx.snapped.point, 0.15);
    actions.setWallDraft(null);
    actions.setPreviewLabel(null);
  },
  onPointerMove: (ctx, actions) => {
    const current = actions.getWallDraft();
    if (!current) return;
    actions.setWallDraft(current.start, ctx.snapped.point);
    const len = measureDistance(current.start, ctx.snapped.point);
    actions.setPreviewLabel(`${len.toFixed(2)} m`, ctx.snapped.point);
  },
  onKeyDown: (e, actions) => {
    if (e.key === 'Escape') {
      actions.setWallDraft(null);
      actions.setPreviewLabel(null);
    }
  }
});
