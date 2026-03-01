import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ID, Obstacle, Project, Room, SnapState, ToolName, Vec2, Wall } from './types';
import { createHistory, pushHistory, redoHistory, undoHistory } from './history';
import { wallSegmentToPolygon } from '../geometry/polylineOffset';
import { polygonArea, polygonPerimeter } from '../geometry/polygonOps';

const newProject = (): Project => ({
  version: '1.0',
  units: 'm',
  meta: {
    name: 'Untitled project',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    gridM: 0.1
  },
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
  draft: Vec2[];
  snap: SnapState;
  view: ViewState;
  hasUnsavedChanges: boolean;
  setTool: (t: ToolName) => void;
  setSelected: (id?: ID) => void;
  addWallSegment: (a: Vec2, b: Vec2, thicknessM?: number) => void;
  addRoomRect: (a: Vec2, b: Vec2) => void;
  addObstacle: (polygon: Vec2[]) => void;
  updateEntityName: (id: ID, name: string) => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  replaceProject: (project: Project) => void;
  setView: (next: Partial<ViewState>) => void;
  markSaved: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  project: newProject(),
  history: createHistory(),
  activeTool: 'select',
  selectedId: undefined,
  draft: [],
  snap: { grid: true, vertex: true, edge: true, midpoint: true },
  view: { x: 0, y: 0, w: 30, h: 20, zoom: 1 / 30 },
  hasUnsavedChanges: false,
  setTool: (activeTool) => set({ activeTool, draft: [] }),
  setSelected: (selectedId) => set({ selectedId }),
  addWallSegment: (a, b, thicknessM = 0.12) => {
    const curr = get().project;
    const wall: Wall = {
      id: nanoid(),
      points: [a, b],
      thicknessM,
      polygon: wallSegmentToPolygon(a, b, thicknessM),
      roomsLeft: [],
      roomsRight: []
    };
    const project = { ...curr, walls: [...curr.walls, wall], meta: { ...curr.meta, modified: new Date().toISOString() } };
    set({ project, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
  },
  addRoomRect: (a, b) => {
    const curr = get().project;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const boundary = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
    const room: Room = {
      id: nanoid(),
      name: `Room ${curr.rooms.length + 1}`,
      boundary,
      wallIds: [],
      areaM2: polygonArea(boundary),
      perimeterM: polygonPerimeter(boundary),
      label: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
    };
    const project = { ...curr, rooms: [...curr.rooms, room], meta: { ...curr.meta, modified: new Date().toISOString() } };
    set({ project, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
  },
  addObstacle: (polygon) => {
    const curr = get().project;
    const obstacle: Obstacle = { id: nanoid(), type: 'no_go', polygon };
    const project = {
      ...curr,
      obstacles: [...curr.obstacles, obstacle],
      meta: { ...curr.meta, modified: new Date().toISOString() }
    };
    set({ project, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
  },
  updateEntityName: (id, name) => {
    const curr = get().project;
    const project = { ...curr, rooms: curr.rooms.map((r) => (r.id === id ? { ...r, name } : r)) };
    set({ project, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
  },
  deleteSelection: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    const curr = get().project;
    const project: Project = {
      ...curr,
      walls: curr.walls.filter((w) => w.id !== selectedId),
      rooms: curr.rooms.filter((r) => r.id !== selectedId),
      obstacles: curr.obstacles.filter((o) => o.id !== selectedId)
    };
    set({ project, selectedId: undefined, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
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
  setView: (next) => set((state) => ({ view: { ...state.view, ...next } })),
  markSaved: () => set({ hasUnsavedChanges: false })
}));
