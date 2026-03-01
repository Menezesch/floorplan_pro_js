import type { ToolName } from '../../model/types';
import type { ToolEventHandlers } from './shared';
import { createSelectToolHandlers } from './SelectTool';
import { createWallToolHandlers } from './WallTool';
import { createRoomRectToolHandlers } from './RoomRectTool';
import { createObstacleToolHandlers } from './ObstacleTool';
import { createOpeningToolHandlers } from './OpeningTool';

export const createToolHandlers = (tool: ToolName): ToolEventHandlers => {
  if (tool === 'select') return createSelectToolHandlers();
  if (tool === 'wall') return createWallToolHandlers();
  if (tool === 'roomRect') return createRoomRectToolHandlers();
  if (tool === 'obstacle') return createObstacleToolHandlers();
  if (tool === 'door') return createOpeningToolHandlers('door');
  if (tool === 'window') return createOpeningToolHandlers('window');
  return {};
};
