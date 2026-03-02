import type { ToolName } from '../model/types';

export const TOOLS: { key: string; name: ToolName; label: string }[] = [
  { key: 'V', name: 'select', label: 'Select' },
  { key: 'G', name: 'move', label: 'Move' },
  { key: 'W', name: 'wall', label: 'Wall' },
  { key: 'R', name: 'roomRect', label: 'Rect Room' },
  { key: 'O', name: 'obstacle', label: 'Obstacle' },
  { key: 'D', name: 'door', label: 'Door' },
  { key: 'N', name: 'window', label: 'Window' },
  { key: 'M', name: 'measure', label: 'Measure' },
  { key: 'Z', name: 'divider', label: 'Room Divider' },
  { key: 'F', name: 'symbol', label: 'Symbol' }
];
