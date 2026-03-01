export type ID = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface ProjectSettings {
  defaultWallThicknessM: number;
  defaultCeilingHeightM: number;
  gridSizeM: number;
  snapThresholdPx: number;
  planOrigin: Vec2;
}

export interface WallSegment {
  id: ID;
  p1: Vec2;
  p2: Vec2;
  thicknessM: number;
}

export interface RectangleRoom {
  id: ID;
  name: string;
  origin: Vec2;
  widthM: number;
  heightM: number;
  classification: 'internal' | 'external';
}

export interface Obstacle {
  id: ID;
  type: 'no_go';
  polygon: Vec2[];
}

export interface Opening {
  id: ID;
  wallId: ID;
  offsetAlongWallM: number;
  widthM: number;
  type: 'window' | 'door';
}

export type ToolName = 'select' | 'wall' | 'obstacle' | 'room' | 'window' | 'door';

export interface ProjectMeta {
  name: string;
  created: string;
  modified: string;
}

export interface Project {
  version: '1.1';
  units: 'm';
  meta: ProjectMeta;
  settings: ProjectSettings;
  walls: WallSegment[];
  rooms: RectangleRoom[];
  obstacles: Obstacle[];
  openings: Opening[];
}

export interface SnapState {
  grid: boolean;
  vertex: boolean;
  active?: 'grid' | 'vertex';
}
