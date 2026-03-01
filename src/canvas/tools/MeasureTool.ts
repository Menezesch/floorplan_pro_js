import { measureDistance } from '../../geometry/measure';
import type { ToolEventHandlers } from './shared';

export const createMeasureToolHandlers = (): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    const draft = actions.getWallDraft();
    if (!draft) {
      actions.setWallDraft(ctx.snapped.point, ctx.snapped.point);
      actions.setMeasure(ctx.snapped.point, ctx.snapped.point, true);
      return;
    }
    actions.setMeasure(draft.start, ctx.snapped.point, false);
    actions.setWallDraft(null);
    actions.setPreviewLabel(null);
  },
  onPointerMove: (ctx, actions) => {
    const draft = actions.getWallDraft();
    if (!draft) return;
    actions.setWallDraft(draft.start, ctx.snapped.point);
    actions.setMeasure(draft.start, ctx.snapped.point, true);
    actions.setPreviewLabel(`${measureDistance(draft.start, ctx.snapped.point).toFixed(2)} m`, ctx.snapped.point);
  },
  onKeyDown: (e, actions) => {
    if (e.key === 'Escape') {
      actions.setWallDraft(null);
      actions.clearMeasure();
      actions.setPreviewLabel(null);
    }
  }
});
