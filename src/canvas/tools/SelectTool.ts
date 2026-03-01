import type { ToolEventHandlers } from './shared';

export const createSelectToolHandlers = (): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    if (ctx.hit.id && ctx.hit.kind !== 'none') actions.setSelected(ctx.hit.id, ctx.hit.kind);
    else actions.setSelected(undefined);
  }
});
