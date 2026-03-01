import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ID, Obstacle, Opening, Project, Room, SnapState, ToolName, Vec2, Wall } from './types';
import { createHistory, pushHistory, redoHistory, undoHistory } from './history';
import { wallSegmentToPolygon } from '../geometry/polylineOffset';
import { polygonArea, polygonPerimeter } from '../geometry/polygonOps';
import { measureDistance } from '../geometry/measure';

const nowIso = () => new Date().toISOString();

const rectFromCorners = (a: Vec2, b: Vec2) => {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const origin = { x: minX, y: minY };
  const widthM = maxX - minX;
  const heightM = maxY - minY;
  const boundary = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
  return { origin, widthM, heightM, boundary };
};

const normalizeRectEntity = (entity: { origin?: Vec2; widthM?: number; heightM?: number; polygon: Vec2[] }) => {
  if (entity.origin && Number.isFinite(entity.widthM) && Number.isFinite(entity.heightM)) {
    return { origin: entity.origin, widthM: entity.widthM as number, heightM: entity.heightM as number };
  }
  const xs = entity.polygon.map((p) => p.x);
  const ys = entity.polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { origin: { x: minX, y: minY }, widthM: maxX - minX, heightM: maxY - minY };
};

const newProject = (): Project => ({
  version: '1.0',
  units: 'm',
  meta: {
    name: 'Untitled project',
    created: nowIso(),
    modified: nowIso(),
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
  addWallSegment: (a: Vec2, b: Vec2, thicknessM?: number) => ID;
  addRoomRect: (a: Vec2, b: Vec2) => ID;
  addObstacleRect: (a: Vec2, b: Vec2) => ID;
  addOpeningToWall: (wallId: ID, type: Opening['type'], distanceAlongM: number, widthM?: number) => ID | undefined;
  updateWallThickness: (id: ID, thicknessM: number) => void;
  updateRoom: (id: ID, patch: Partial<Pick<Room, 'name' | 'classification' | 'origin' | 'widthM' | 'heightM'>>) => void;
  updateObstacle: (id: ID, patch: Partial<Pick<Obstacle, 'origin' | 'widthM' | 'heightM'>>) => void;
  updateOpening: (id: ID, patch: Partial<Pick<Opening, 'widthM' | 'distanceAlongM'>>) => void;
  updateEntityName: (id: ID, name: string) => void;
  moveWall: (id: ID, delta: Vec2) => void;
  moveRoom: (id: ID, delta: Vec2) => void;
  moveObstacle: (id: ID, delta: Vec2) => void;
  moveOpeningAlongWall: (id: ID, distanceAlongM: number) => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  replaceProject: (project: Project) => void;
  setView: (next: Partial<ViewState>) => void;
  markSaved: () => void;
}

const normalizeProject = (project: Project): Project => ({
  ...project,
  rooms: project.rooms.map((room) => {
    if (room.origin && Number.isFinite(room.widthM) && Number.isFinite(room.heightM) && room.boundary.length >= 4 && room.classification) return room;
    const xs = room.boundary.map((p) => p.x);
    const ys = room.boundary.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      ...room,
      classification: room.classification ?? 'internal',
      origin: room.origin ?? { x: minX, y: minY },
      widthM: Number.isFinite(room.widthM) ? room.widthM : maxX - minX,
      heightM: Number.isFinite(room.heightM) ? room.heightM : maxY - minY
    };
  }),
  obstacles: project.obstacles.map((obs) => {
    if (obs.origin && Number.isFinite(obs.widthM) && Number.isFinite(obs.heightM) && obs.polygon.length >= 4) return obs;
    const xs = obs.polygon.map((p) => p.x);
    const ys = obs.polygon.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      ...obs,
      origin: obs.origin ?? { x: minX, y: minY },
      widthM: Number.isFinite(obs.widthM) ? obs.widthM : maxX - minX,
      heightM: Number.isFinite(obs.heightM) ? obs.heightM : maxY - minY
    };
  })
});

const withProjectUpdate = (set: (next: Partial<AppStore>) => void, get: () => AppStore, updater: (project: Project) => Project) => {
  const curr = get().project;
  const project = updater(curr);
  set({ project: { ...project, meta: { ...project.meta, modified: nowIso() } }, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
};

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
  addWallSegment: (a, b, thicknessM = 0.15) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => {
      const wall: Wall = {
        id,
        points: [a, b],
        thicknessM,
        polygon: wallSegmentToPolygon(a, b, thicknessM),
        roomsLeft: [],
        roomsRight: []
      };
      return { ...curr, walls: [...curr.walls, wall] };
    });
    return id;
  },
  addRoomRect: (a, b) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => {
      const rect = rectFromCorners(a, b);
      const room: Room = {
        id,
        name: 'Room',
        classification: 'internal',
        origin: rect.origin,
        widthM: rect.widthM,
        heightM: rect.heightM,
        boundary: rect.boundary,
        wallIds: [],
        areaM2: polygonArea(rect.boundary),
        perimeterM: polygonPerimeter(rect.boundary),
        label: { x: rect.origin.x + rect.widthM / 2, y: rect.origin.y + rect.heightM / 2 }
      };
      return { ...curr, rooms: [...curr.rooms, room] };
    });
    return id;
  },
  addObstacleRect: (a, b) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => {
      const rect = rectFromCorners(a, b);
      const obstacle: Obstacle = {
        id,
        type: 'no_go',
        origin: rect.origin,
        widthM: rect.widthM,
        heightM: rect.heightM,
        polygon: rect.boundary
      };
      return { ...curr, obstacles: [...curr.obstacles, obstacle] };
    });
    return id;
  },
  addOpeningToWall: (wallId, type, distanceAlongM, widthM) => {
    const wall = get().project.walls.find((w) => w.id === wallId);
    if (!wall) return undefined;
    const len = measureDistance(wall.points[0], wall.points[1]);
    const id = nanoid();
    const opening: Opening = {
      id,
      wallId,
      type,
      widthM: widthM ?? (type === 'door' ? 0.9 : 1.2),
      distanceAlongM: Math.min(len, Math.max(0, distanceAlongM)),
      orientation: 'left'
    };
    withProjectUpdate(set, get, (curr) => ({ ...curr, openings: [...curr.openings, opening] }));
    return id;
  },
  updateWallThickness: (id, thicknessM) => {
    withProjectUpdate(set, get, (curr) => ({
      ...curr,
      walls: curr.walls.map((w) => (w.id === id ? { ...w, thicknessM, polygon: wallSegmentToPolygon(w.points[0], w.points[1], thicknessM) } : w))
    }));
  },
  updateRoom: (id, patch) => {
    withProjectUpdate(set, get, (curr) => ({
      ...curr,
      rooms: curr.rooms.map((r) => {
        if (r.id !== id) return r;
        const rect = normalizeRectEntity({ origin: r.origin, widthM: r.widthM, heightM: r.heightM, polygon: r.boundary });
        const origin = patch.origin ?? rect.origin;
        const widthM = patch.widthM ?? rect.widthM;
        const heightM = patch.heightM ?? rect.heightM;
        const boundary = [
          { x: origin.x, y: origin.y },
          { x: origin.x + widthM, y: origin.y },
          { x: origin.x + widthM, y: origin.y + heightM },
          { x: origin.x, y: origin.y + heightM }
        ];
        return {
          ...r,
          ...patch,
          origin,
          widthM,
          heightM,
          boundary,
          areaM2: polygonArea(boundary),
          perimeterM: polygonPerimeter(boundary),
          label: { x: origin.x + widthM / 2, y: origin.y + heightM / 2 }
        };
      })
    }));
  },
  updateObstacle: (id, patch) => {
    withProjectUpdate(set, get, (curr) => ({
      ...curr,
      obstacles: curr.obstacles.map((o) => {
        if (o.id !== id) return o;
        const rect = normalizeRectEntity({ origin: o.origin, widthM: o.widthM, heightM: o.heightM, polygon: o.polygon });
        const origin = patch.origin ?? rect.origin;
        const widthM = patch.widthM ?? rect.widthM;
        const heightM = patch.heightM ?? rect.heightM;
        const polygon = [
          { x: origin.x, y: origin.y },
          { x: origin.x + widthM, y: origin.y },
          { x: origin.x + widthM, y: origin.y + heightM },
          { x: origin.x, y: origin.y + heightM }
        ];
        return { ...o, ...patch, origin, widthM, heightM, polygon };
      })
    }));
  },
  updateOpening: (id, patch) => {
    withProjectUpdate(set, get, (curr) => ({ ...curr, openings: curr.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  },
  updateEntityName: (id, name) => {
    const room = get().project.rooms.find((r) => r.id === id);
    if (room) get().updateRoom(id, { name });
  },
  moveWall: (id, delta) => {
    withProjectUpdate(set, get, (curr) => ({
      ...curr,
      walls: curr.walls.map((w) => {
        if (w.id !== id) return w;
        const points = w.points.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y }));
        return { ...w, points, polygon: wallSegmentToPolygon(points[0], points[1], w.thicknessM) };
      })
    }));
  },
  moveRoom: (id, delta) => {
    const room = get().project.rooms.find((r) => r.id === id);
    if (!room) return;
    const rect = normalizeRectEntity({ origin: room.origin, widthM: room.widthM, heightM: room.heightM, polygon: room.boundary });
    get().updateRoom(id, { origin: { x: rect.origin.x + delta.x, y: rect.origin.y + delta.y } });
  },
  moveObstacle: (id, delta) => {
    const obstacle = get().project.obstacles.find((o) => o.id === id);
    if (!obstacle) return;
    const rect = normalizeRectEntity({ origin: obstacle.origin, widthM: obstacle.widthM, heightM: obstacle.heightM, polygon: obstacle.polygon });
    get().updateObstacle(id, { origin: { x: rect.origin.x + delta.x, y: rect.origin.y + delta.y } });
  },
  moveOpeningAlongWall: (id, distanceAlongM) => {
    const { project } = get();
    const opening = project.openings.find((o) => o.id === id);
    if (!opening) return;
    const wall = project.walls.find((w) => w.id === opening.wallId);
    if (!wall) return;
    const len = measureDistance(wall.points[0], wall.points[1]);
    get().updateOpening(id, { distanceAlongM: Math.max(0, Math.min(len, distanceAlongM)) });
  },
  deleteSelection: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    withProjectUpdate(set, get, (curr) => {
      const wallDeleted = curr.walls.some((w) => w.id === selectedId);
      return {
        ...curr,
        walls: curr.walls.filter((w) => w.id !== selectedId),
        rooms: curr.rooms.filter((r) => r.id !== selectedId),
        obstacles: curr.obstacles.filter((o) => o.id !== selectedId),
        openings: curr.openings.filter((o) => o.id !== selectedId && (!wallDeleted || o.wallId !== selectedId))
      };
    });
    set({ selectedId: undefined });
  },
  undo: () => {
    const { history, project } = get();
    const next = undoHistory(history, project);
    if (next.project) set({ history: next.history, project: normalizeProject(next.project), hasUnsavedChanges: true });
  },
  redo: () => {
    const { history, project } = get();
    const next = redoHistory(history, project);
    if (next.project) set({ history: next.history, project: normalizeProject(next.project), hasUnsavedChanges: true });
  },
  replaceProject: (project) => set({ project: normalizeProject(project), history: createHistory(), hasUnsavedChanges: false }),
  setView: (next) => set((state) => ({ view: { ...state.view, ...next } })),
  markSaved: () => set({ hasUnsavedChanges: false })
}));
