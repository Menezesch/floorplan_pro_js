export type ID = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Wall {
  id: ID;
  points: Vec2[];
  thicknessM: number;
  polygon: Vec2[];
  roomsLeft: ID[];
  roomsRight: ID[];
}

export interface Room {
  id: ID;
  name: string;
  boundary: Vec2[];
  wallIds: ID[];
  areaM2: number;
  perimeterM: number;
  label?: Vec2;
}

export interface Obstacle {
  id: ID;
  type: 'no_go';
  polygon: Vec2[];
}

export interface Opening {
  id: ID;
  wallId: ID;
  distanceAlongM: number;
  widthM: number;
  type: 'door' | 'window';
  orientation: 'left' | 'right' | 'in' | 'out';
}

export type ToolName = 'select' | 'wall' | 'roomRect' | 'obstacle' | 'measure' | 'opening';

export interface ProjectMeta {
  name: string;
  created: string;
  modified: string;
  gridM: number;
}

export interface Project {
  version: '1.0';
  units: 'm';
  meta: ProjectMeta;
  walls: Wall[];
  rooms: Room[];
  obstacles: Obstacle[];
  openings: Opening[];
}

export interface SnapState {
  grid: boolean;
  vertex: boolean;
  edge: boolean;
  midpoint: boolean;
  active?: 'grid' | 'vertex' | 'edge' | 'midpoint' | 'angle';
}
