import { pickNearestEdge } from '../../geometry/edgePick';
import type { Opening } from '../../model/types';
import type { ToolEventHandlers } from './shared';

export const createOpeningToolHandlers = (type: Opening['type']): ToolEventHandlers => ({
  onPointerDown: (ctx, actions) => {
    const toleranceM = 14 / Math.max(1e-6, ctx.pixelsPerMeter);
    const nearest = pickNearestEdge(ctx.project, ctx.rawWorld, toleranceM);
    const selectedEdge = ctx.selectedKind === 'edge' ? ctx.selectedId : undefined;
    const wallId = nearest?.edgeId ?? (ctx.hit.kind === 'edge' ? ctx.hit.id : selectedEdge);
    if (!wallId) return;
    const distanceAlongM = nearest?.distanceAlongM ?? 0;
    const openingId = actions.addOpeningToWall(wallId, type, distanceAlongM, type === 'door' ? 0.9 : 1.2);
    if (openingId) actions.setSelected(openingId, 'opening');
  }
});
