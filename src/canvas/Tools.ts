import type { ToolName } from '../model/types';

export const TOOLS: { key: string; name: ToolName; label: string }[] = [
  { key: 'V', name: 'select', label: 'Select' },
  { key: 'W', name: 'wall', label: 'Wall' },
  { key: 'R', name: 'roomRect', label: 'Rect Room' },
  { key: 'O', name: 'obstacle', label: 'Obstacle' },
  { key: 'M', name: 'measure', label: 'Measure' },
  { key: 'P', name: 'opening', label: 'Opening' }
];
