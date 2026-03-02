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
  locked?: boolean;
}

export interface WallVertex {
  id: ID;
  x: number;
  y: number;
  locked?: boolean;
}

export interface WallEdge {
  id: ID;
  v1Id: ID;
  v2Id: ID;
  thicknessM: number;
  locked?: boolean;
  isWaterWall?: boolean;
}

export interface Room {
  id: ID;
  name: string;
  classification?: 'internal' | 'external';
  origin?: Vec2;
  widthM?: number;
  heightM?: number;
  boundary: Vec2[];
  wallIds: ID[];
  areaM2: number;
  perimeterM: number;
  label?: Vec2;
  locked?: boolean;
}

export interface Obstacle {
  id: ID;
  type: 'no_go';
  origin?: Vec2;
  widthM?: number;
  heightM?: number;
  polygon: Vec2[];
  locked?: boolean;
}

export interface Opening {
  id: ID;
  wallId: ID;
  distanceAlongM: number;
  widthM: number;
  type: 'door' | 'window';
  orientation: 'left' | 'right' | 'in' | 'out';
  locked?: boolean;
}

export interface RoomDivider {
  id: ID;
  start: Vec2;
  end: Vec2;
  name: string;
  locked?: boolean;
}

export type SymbolType = 'chair' | 'table' | 'sofa' | 'bed' | 'sink' | 'toilet' | 'bathtub' | 'desk';

export interface FloorSymbol {
  id: ID;
  type: SymbolType;
  position: Vec2;
  rotation: number;
  widthM: number;
  heightM: number;
  locked?: boolean;
}

export type ToolName = 'select' | 'move' | 'wall' | 'roomRect' | 'obstacle' | 'door' | 'window' | 'measure' | 'divider' | 'symbol';

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
  wallVertices: WallVertex[];
  wallEdges: WallEdge[];
  rooms: Room[];
  obstacles: Obstacle[];
  openings: Opening[];
  roomDividers?: RoomDivider[];
  floorSymbols?: FloorSymbol[];
}

export interface SnapState {
  grid: boolean;
  vertex: boolean;
  edge: boolean;
  midpoint: boolean;
  active?: 'grid' | 'vertex' | 'edge' | 'midpoint' | 'angle';
}
