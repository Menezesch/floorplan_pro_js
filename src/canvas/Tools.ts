import { DoorClosed, MousePointer2, Pentagon, RectangleHorizontal, Square, PanelTop } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ToolName } from '../model/types';

export interface ToolDef {
  key: string;
  name: ToolName;
  label: string;
  icon: LucideIcon;
}

export const TOOLS: ToolDef[] = [
  { key: 'V', name: 'select', label: 'Select', icon: MousePointer2 },
  { key: 'W', name: 'wall', label: 'Wall', icon: PanelTop },
  { key: 'O', name: 'obstacle', label: 'Obstacle', icon: Pentagon },
  { key: 'R', name: 'room', label: 'Room', icon: RectangleHorizontal },
  { key: 'N', name: 'window', label: 'Windows', icon: Square },
  { key: 'D', name: 'door', label: 'Doors', icon: DoorClosed }
];
