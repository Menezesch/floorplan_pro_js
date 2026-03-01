import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ID, Obstacle, Opening, Project, ProjectSettings, RectangleRoom, SnapState, ToolName, Vec2, WallSegment } from './types';
import { createHistory, pushHistory, redoHistory, undoHistory } from './history';
import { wallLengthM } from '../geometry/measure';
import { detectAxisAlignedRectangle } from './rectangleDetection';

const defaultSettings = (): ProjectSettings => ({
  defaultWallThicknessM: 0.15,
  defaultCeilingHeightM: 2.5,
  gridSizeM: 0.05,
  snapThresholdPx: 10,
  planOrigin: { x: 0, y: 0 }
});

const newProject = (): Project => ({
  version: '1.1',
  units: 'm',
  meta: {
    name: 'Untitled project',
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  },
  settings: defaultSettings(),
  walls: [],
  rooms: [],
  obstacles: [],
  openings: []
});

interface ViewState {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
}

interface AppStore {
  project: Project;
  history: ReturnType<typeof createHistory>;
  activeTool: ToolName;
  selectedId?: ID;
  snap: SnapState;
  view: ViewState;
  hasUnsavedChanges: boolean;
  pointerWorld?: Vec2;
  snapIndicator?: Vec2;
  setTool: (t: ToolName) => void;
  setSelected: (id?: ID) => void;
  setPointerWorld: (point?: Vec2) => void;
  setSnapIndicator: (point?: Vec2) => void;
  setSnapActive: (active?: SnapState['active']) => void;
  addWallSegment: (a: Vec2, b: Vec2) => void;
  addRoomRect: (a: Vec2, b: Vec2) => void;
  addObstacleRect: (a: Vec2, b: Vec2) => void;
  addOpeningOnWall: (wallId: ID, click: Vec2, type: 'window' | 'door') => void;
  updateWall: (id: ID, patch: Partial<Pick<WallSegment, 'thicknessM'>>) => void;
  updateRoom: (id: ID, patch: Partial<Pick<RectangleRoom, 'name' | 'widthM' | 'heightM' | 'classification'>>) => void;
  updateSettings: (patch: Partial<ProjectSettings>) => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  replaceProject: (project: Project) => void;
  setView: (updater: (prev: ViewState) => ViewState) => void;
  markSaved: () => void;
}

const withModifiedMeta = (project: Project): Project => ({
  ...project,
  meta: { ...project.meta, modified: new Date().toISOString() }
});

const maybeConvertRecentWallsToRoom = (project: Project): Project => {
  if (project.walls.length < 4) return project;
  const recent = project.walls.slice(-4);
  const room = detectAxisAlignedRectangle(recent);
  if (!room) return project;
  return {
    ...project,
    walls: project.walls.slice(0, -4),
    rooms: [...project.rooms, { ...room, name: `Room ${project.rooms.length + 1}` }]
  };
};

const pointProjectionOffset = (wall: WallSegment, click: Vec2): number => {
  const abx = wall.p2.x - wall.p1.x;
  const aby = wall.p2.y - wall.p1.y;
  const len2 = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, ((click.x - wall.p1.x) * abx + (click.y - wall.p1.y) * aby) / len2));
  return wallLengthM(wall) * t;
};

export const useAppStore = create<AppStore>((set, get) => ({
  project: newProject(),
  history: createHistory(),
  activeTool: 'select',
  selectedId: undefined,
  snap: { grid: true, vertex: true, active: undefined },
  view: { x: -200, y: -200, w: 4000, h: 2600, zoom: 1 },
  hasUnsavedChanges: false,
  pointerWorld: undefined,
  snapIndicator: undefined,
  setTool: (activeTool) => set({ activeTool }),
  setSelected: (selectedId) => set({ selectedId }),
  setPointerWorld: (pointerWorld) => set({ pointerWorld }),
  setSnapIndicator: (snapIndicator) => set({ snapIndicator }),
  setSnapActive: (active) => set((state) => ({ snap: { ...state.snap, active } })),
  addWallSegment: (a, b) => {
    const current = get().project;
    const wall: WallSegment = {
      id: nanoid(),
      p1: a,
      p2: b,
      thicknessM: current.settings.defaultWallThicknessM
    };
    const project = maybeConvertRecentWallsToRoom(withModifiedMeta({ ...current, walls: [...current.walls, wall] }));
    set({ project, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  addRoomRect: (a, b) => {
    const current = get().project;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const room: RectangleRoom = {
      id: nanoid(),
      name: `Room ${current.rooms.length + 1}`,
      origin: { x: minX, y: minY },
      widthM: maxX - minX,
      heightM: maxY - minY,
      classification: 'internal'
    };
    const project = withModifiedMeta({ ...current, rooms: [...current.rooms, room] });
    set({ project, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  addObstacleRect: (a, b) => {
    const current = get().project;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const obstacle: Obstacle = {
      id: nanoid(),
      type: 'no_go',
      polygon: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ]
    };
    const project = withModifiedMeta({ ...current, obstacles: [...current.obstacles, obstacle] });
    set({ project, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  addOpeningOnWall: (wallId, click, type) => {
    const current = get().project;
    const wall = current.walls.find((item) => item.id === wallId);
    if (!wall) return;
    const opening: Opening = {
      id: nanoid(),
      wallId,
      offsetAlongWallM: pointProjectionOffset(wall, click),
      widthM: type === 'door' ? 0.9 : 1.2,
      type
    };
    const project = withModifiedMeta({ ...current, openings: [...current.openings, opening] });
    set({ project, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  updateWall: (id, patch) => {
    const current = get().project;
    const project = withModifiedMeta({
      ...current,
      walls: current.walls.map((wall) => (wall.id === id ? { ...wall, ...patch } : wall))
    });
    set({ project, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  updateRoom: (id, patch) => {
    const current = get().project;
    const project = withModifiedMeta({
      ...current,
      rooms: current.rooms.map((room) => (room.id === id ? { ...room, ...patch } : room))
    });
    set({ project, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  updateSettings: (patch) => {
    const current = get().project;
    const project = withModifiedMeta({ ...current, settings: { ...current.settings, ...patch } });
    set({ project, hasUnsavedChanges: true });
  },
  deleteSelection: () => {
    const selectedId = get().selectedId;
    if (!selectedId) return;
    const current = get().project;
    const project = withModifiedMeta({
      ...current,
      walls: current.walls.filter((item) => item.id !== selectedId),
      rooms: current.rooms.filter((item) => item.id !== selectedId),
      obstacles: current.obstacles.filter((item) => item.id !== selectedId),
      openings: current.openings.filter((item) => item.id !== selectedId)
    });
    set({ project, selectedId: undefined, history: pushHistory(get().history, current), hasUnsavedChanges: true });
  },
  undo: () => {
    const { history, project } = get();
    const next = undoHistory(history, project);
    if (next.project) set({ history: next.history, project: next.project, hasUnsavedChanges: true });
  },
  redo: () => {
    const { history, project } = get();
    const next = redoHistory(history, project);
    if (next.project) set({ history: next.history, project: next.project, hasUnsavedChanges: true });
  },
  replaceProject: (project) => set({ project, history: createHistory(), hasUnsavedChanges: false }),
  setView: (updater) => set((state) => ({ view: updater(state.view) })),
  markSaved: () => set({ hasUnsavedChanges: false })
}));
