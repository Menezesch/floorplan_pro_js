import type { Opening, Project, SnapState, ToolName, Vec2 } from '../../model/types';
import type { SnapResult } from '../Snap';

export interface HitEntity {
  kind: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening' | 'none';
  id?: string;
}

export interface ToolContext {
  tool: ToolName;
  rawWorld: Vec2;
  snapped: SnapResult;
  pixelsPerMeter: number;
  project: Project;
  snapState: SnapState;
  hit: HitEntity;
  selectedId?: string;
  selectedKind?: HitEntity['kind'];
  shiftKey: boolean;
}

export interface ToolActions {
  setSelected: (id?: string, kind?: Exclude<HitEntity['kind'], 'none'>) => void;
  setWallDraft: (start: Vec2 | null, end?: Vec2 | null) => void;
  getWallDraft: () => { start: Vec2; end?: Vec2 } | null;
  setRectDraft: (start: Vec2 | null, end: Vec2 | null, kind: 'roomRect' | 'obstacle' | null) => void;
  getRectDraft: () => { start: Vec2; end: Vec2; kind: 'roomRect' | 'obstacle' } | null;
  setPreviewLabel: (text: string | null, point?: Vec2) => void;
  addWallSegment: (a: Vec2, b: Vec2, thicknessM?: number) => string;
  addRoomRect: (a: Vec2, b: Vec2) => string;
  addObstacleRect: (a: Vec2, b: Vec2) => string;
  addOpeningToWall: (wallId: string, type: Opening['type'], distanceAlongM: number, widthM?: number) => string | undefined;
  moveVertex: (id: string, delta: Vec2) => void;
  moveEdge: (id: string, delta: Vec2) => void;
  moveRoom: (id: string, delta: Vec2) => void;
  moveObstacle: (id: string, delta: Vec2) => void;
  moveOpeningAlongWall: (id: string, distanceAlongM: number) => void;
  setMeasure: (start?: Vec2, end?: Vec2, active?: boolean) => void;
  clearMeasure: () => void;
}

export interface ToolEventHandlers {
  onPointerDown?: (ctx: ToolContext, actions: ToolActions) => void;
  onPointerMove?: (ctx: ToolContext, actions: ToolActions) => void;
  onPointerUp?: (ctx: ToolContext, actions: ToolActions) => void;
  onKeyDown?: (e: KeyboardEvent, actions: ToolActions) => void;
}
