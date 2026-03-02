import type { ToolEventHandlers } from './shared';

export const createSymbolToolHandlers = (): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    const type = ctx.activeSymbolType ?? 'chair';
    actions.addFloorSymbol(type, ctx.snapped.point);
  }
});
