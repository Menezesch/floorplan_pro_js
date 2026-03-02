import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { FloorSymbol, ID, Obstacle, Opening, Project, Room, RoomDivider, SnapState, SymbolType, ToolName, Vec2, Wall, WallEdge, WallVertex } from './types';
import { createHistory, pushHistory, redoHistory, undoHistory } from './history';
import { wallSegmentToPolygon } from '../geometry/polylineOffset';
import { polygonArea, polygonPerimeter } from '../geometry/polygonOps';
import { measureDistance } from '../geometry/measure';
import { MIN_VIEW_SIZE_M, MAX_VIEW_SIZE_M, clamp } from '../canvas/konva/ViewportTransform';

const nowIso = () => new Date().toISOString();
const TOPOLOGY_EPSILON_M = 0.01;
const DEFAULT_VIEW_W_M = 30;

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
  if (entity.origin && Number.isFinite(entity.widthM) && Number.isFinite(entity.heightM)) return { origin: entity.origin, widthM: entity.widthM as number, heightM: entity.heightM as number };
  const xs = entity.polygon.map((p) => p.x);
  const ys = entity.polygon.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { origin: { x: minX, y: minY }, widthM: maxX - minX, heightM: maxY - minY };
};

const deriveWallsFromTopology = (vertices: WallVertex[], edges: WallEdge[]): Wall[] => {
  const byId = new Map(vertices.map((v) => [v.id, v]));
  return edges.flatMap((e) => {
    const a = byId.get(e.v1Id);
    const b = byId.get(e.v2Id);
    if (!a || !b) return [];
    const p1 = { x: a.x, y: a.y };
    const p2 = { x: b.x, y: b.y };
    return [{ id: e.id, points: [p1, p2], thicknessM: e.thicknessM, polygon: wallSegmentToPolygon(p1, p2, e.thicknessM), roomsLeft: [], roomsRight: [], locked: e.locked } satisfies Wall];
  });
};

const findOrCreateMergedVertex = (vertices: WallVertex[], point: Vec2, epsilonM: number) => {
  const found = vertices.find((v) => Math.hypot(v.x - point.x, v.y - point.y) <= epsilonM);
  if (found) return found.id;
  const id = nanoid();
  vertices.push({ id, x: point.x, y: point.y, locked: false });
  return id;
};

const newProject = (): Project => ({
  version: '1.0',
  units: 'm',
  meta: { name: 'Untitled project', created: nowIso(), modified: nowIso(), gridM: 0.1 },
  walls: [],
  wallVertices: [],
  wallEdges: [],
  rooms: [],
  obstacles: [],
  openings: [],
  roomDividers: [],
  floorSymbols: []
});

interface ViewState {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
}

interface MeasureState {
  start?: Vec2;
  end?: Vec2;
  active: boolean;
}

interface AppStore {
  project: Project;
  history: ReturnType<typeof createHistory>;
  activeTool: ToolName;
  activeSymbolType: SymbolType;
  selectedId?: ID;
  selectedKind?: 'vertex' | 'edge' | 'room' | 'obstacle' | 'opening' | 'divider' | 'symbol';
  draft: Vec2[];
  snap: SnapState;
  view: ViewState;
  measure: MeasureState;
  hasUnsavedChanges: boolean;
  gridVisible: boolean;
  setTool: (t: ToolName) => void;
  setActiveSymbolType: (t: SymbolType) => void;
  setSelected: (id?: ID, kind?: AppStore['selectedKind']) => void;
  addWallSegment: (a: Vec2, b: Vec2, thicknessM?: number) => ID;
  addRoomRect: (a: Vec2, b: Vec2) => ID;
  addObstacleRect: (a: Vec2, b: Vec2) => ID;
  addOpeningToWall: (wallId: ID, type: Opening['type'], distanceAlongM: number, widthM?: number) => ID | undefined;
  addRoomDivider: (start: Vec2, end: Vec2, name?: string) => ID;
  addFloorSymbol: (type: SymbolType, position: Vec2) => ID;
  updateWallThickness: (id: ID, thicknessM: number) => void;
  updateRoom: (id: ID, patch: Partial<Pick<Room, 'name' | 'classification' | 'origin' | 'widthM' | 'heightM' | 'locked'>>) => void;
  updateObstacle: (id: ID, patch: Partial<Pick<Obstacle, 'origin' | 'widthM' | 'heightM' | 'locked'>>) => void;
  updateOpening: (id: ID, patch: Partial<Pick<Opening, 'widthM' | 'distanceAlongM' | 'locked'>>) => void;
  updateVertex: (id: ID, patch: Partial<Pick<WallVertex, 'locked'>>) => void;
  updateEdge: (id: ID, patch: Partial<Pick<WallEdge, 'locked' | 'thicknessM' | 'isWaterWall'>>) => void;
  updateRoomDivider: (id: ID, patch: Partial<Pick<RoomDivider, 'name' | 'locked'>>) => void;
  updateFloorSymbol: (id: ID, patch: Partial<Pick<FloorSymbol, 'rotation' | 'widthM' | 'heightM' | 'locked'>>) => void;
  updateEntityName: (id: ID, name: string) => void;
  moveWall: (id: ID, delta: Vec2) => void;
  moveVertex: (id: ID, delta: Vec2) => void;
  moveEdge: (id: ID, delta: Vec2) => void;
  moveRoom: (id: ID, delta: Vec2) => void;
  moveObstacle: (id: ID, delta: Vec2) => void;
  moveOpeningAlongWall: (id: ID, distanceAlongM: number) => void;
  moveRoomDivider: (id: ID, delta: Vec2) => void;
  moveFloorSymbol: (id: ID, delta: Vec2) => void;
  setMeasure: (patch: Partial<MeasureState>) => void;
  clearMeasure: () => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  replaceProject: (project: Project) => void;
  setView: (next: Partial<ViewState>) => void;
  fitToScreen: () => void;
  toggleGrid: () => void;
  markSaved: () => void;
}

const normalizeProject = (project: Project): Project => {
  const epsilonM = Math.max(TOPOLOGY_EPSILON_M, (project.meta.gridM ?? 0.05) / 5);
  const normalizedVertices = [...(project.wallVertices ?? [])];
  const normalizedEdges = [...(project.wallEdges ?? [])];

  if (normalizedEdges.length === 0 && project.walls.length > 0) {
    for (const w of project.walls) {
      const p1 = w.points[0];
      const p2 = w.points[w.points.length - 1];
      const v1Id = findOrCreateMergedVertex(normalizedVertices, p1, epsilonM);
      const v2Id = findOrCreateMergedVertex(normalizedVertices, p2, epsilonM);
      normalizedEdges.push({ id: w.id, v1Id, v2Id, thicknessM: w.thicknessM, locked: w.locked ?? false });
    }
  }

  const walls = deriveWallsFromTopology(normalizedVertices, normalizedEdges);

  return {
    ...project,
    wallVertices: normalizedVertices,
    wallEdges: normalizedEdges,
    walls,
    rooms: project.rooms.map((room) => {
      if (room.origin && Number.isFinite(room.widthM) && Number.isFinite(room.heightM) && room.boundary.length >= 4 && room.classification) return room;
      const xs = room.boundary.map((p) => p.x);
      const ys = room.boundary.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { ...room, classification: room.classification ?? 'internal', origin: room.origin ?? { x: minX, y: minY }, widthM: Number.isFinite(room.widthM) ? room.widthM : maxX - minX, heightM: Number.isFinite(room.heightM) ? room.heightM : maxY - minY, locked: room.locked ?? false };
    }),
    obstacles: project.obstacles.map((obs) => {
      if (obs.origin && Number.isFinite(obs.widthM) && Number.isFinite(obs.heightM) && obs.polygon.length >= 4) return { ...obs, locked: obs.locked ?? false };
      const xs = obs.polygon.map((p) => p.x);
      const ys = obs.polygon.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { ...obs, origin: obs.origin ?? { x: minX, y: minY }, widthM: Number.isFinite(obs.widthM) ? obs.widthM : maxX - minX, heightM: Number.isFinite(obs.heightM) ? obs.heightM : maxY - minY, locked: obs.locked ?? false };
    }),
    openings: project.openings.map((o) => ({ ...o, locked: o.locked ?? false })),
    roomDividers: project.roomDividers ?? [],
    floorSymbols: project.floorSymbols ?? []
  };
};

const withProjectUpdate = (set: (next: Partial<AppStore>) => void, get: () => AppStore, updater: (project: Project) => Project) => {
  const curr = get().project;
  const nextRaw = updater(curr);
  const project = normalizeProject({ ...nextRaw, meta: { ...nextRaw.meta, modified: nowIso() } });
  set({ project, history: pushHistory(get().history, curr), hasUnsavedChanges: true });
};

export const useAppStore = create<AppStore>((set, get) => ({
  project: normalizeProject(newProject()),
  history: createHistory(),
  activeTool: 'select',
  activeSymbolType: 'chair',
  selectedId: undefined,
  selectedKind: undefined,
  draft: [],
  snap: { grid: true, vertex: true, edge: true, midpoint: true },
  view: { x: 0, y: 0, w: DEFAULT_VIEW_W_M, h: 20, zoom: 1 / DEFAULT_VIEW_W_M },
  measure: { active: false },
  hasUnsavedChanges: false,
  gridVisible: true,
  setTool: (activeTool) => set({ activeTool, draft: [], measure: activeTool === 'measure' ? { active: false } : get().measure }),
  setActiveSymbolType: (activeSymbolType) => set({ activeSymbolType }),
  setSelected: (selectedId, selectedKind) => set({ selectedId, selectedKind }),
  addWallSegment: (a, b, thicknessM = 0.15) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => {
      const v1Id = findOrCreateMergedVertex([...curr.wallVertices], a, Math.max(TOPOLOGY_EPSILON_M, curr.meta.gridM / 5));
      const mutableVertices = [...curr.wallVertices];
      if (!mutableVertices.some((v) => v.id === v1Id)) mutableVertices.push({ id: v1Id, x: a.x, y: a.y, locked: false });
      const v2Id = findOrCreateMergedVertex(mutableVertices, b, Math.max(TOPOLOGY_EPSILON_M, curr.meta.gridM / 5));
      return { ...curr, wallVertices: mutableVertices, wallEdges: [...curr.wallEdges, { id, v1Id, v2Id, thicknessM, locked: false }] };
    });
    return id;
  },
  addRoomRect: (a, b) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => {
      const rect = rectFromCorners(a, b);
      const room: Room = { id, name: 'Room', classification: 'internal', origin: rect.origin, widthM: rect.widthM, heightM: rect.heightM, boundary: rect.boundary, wallIds: [], areaM2: polygonArea(rect.boundary), perimeterM: polygonPerimeter(rect.boundary), label: { x: rect.origin.x + rect.widthM / 2, y: rect.origin.y + rect.heightM / 2 }, locked: false };
      return { ...curr, rooms: [...curr.rooms, room] };
    });
    return id;
  },
  addObstacleRect: (a, b) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => {
      const rect = rectFromCorners(a, b);
      const obstacle: Obstacle = { id, type: 'no_go', origin: rect.origin, widthM: rect.widthM, heightM: rect.heightM, polygon: rect.boundary, locked: false };
      return { ...curr, obstacles: [...curr.obstacles, obstacle] };
    });
    return id;
  },
  addOpeningToWall: (wallId, type, distanceAlongM, widthM) => {
    const wall = get().project.walls.find((w) => w.id === wallId);
    if (!wall) return undefined;
    const len = measureDistance(wall.points[0], wall.points[1]);
    const id = nanoid();
    const safeWidth = widthM ?? (type === 'door' ? 0.9 : 1.2);
    const opening: Opening = { id, wallId, type, widthM: safeWidth, distanceAlongM: Math.max(safeWidth / 2, Math.min(len - safeWidth / 2, distanceAlongM)), orientation: 'left', locked: false };
    withProjectUpdate(set, get, (curr) => ({ ...curr, openings: [...curr.openings, opening] }));
    return id;
  },
  addRoomDivider: (start, end, name = 'Zone') => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => ({ ...curr, roomDividers: [...(curr.roomDividers ?? []), { id, start, end, name, locked: false }] }));
    return id;
  },
  addFloorSymbol: (type, position) => {
    const id = nanoid();
    withProjectUpdate(set, get, (curr) => ({ ...curr, floorSymbols: [...(curr.floorSymbols ?? []), { id, type, position, rotation: 0, widthM: 0.5, heightM: 0.5, locked: false }] }));
    return id;
  },
  updateWallThickness: (id, thicknessM) => withProjectUpdate(set, get, (curr) => ({ ...curr, wallEdges: curr.wallEdges.map((e) => (e.id === id ? { ...e, thicknessM } : e)) })),
  updateRoom: (id, patch) => withProjectUpdate(set, get, (curr) => ({
    ...curr,
    rooms: curr.rooms.map((r) => {
      if (r.id !== id) return r;
      const rect = normalizeRectEntity({ origin: r.origin, widthM: r.widthM, heightM: r.heightM, polygon: r.boundary });
      const origin = patch.origin ?? rect.origin;
      const widthM = patch.widthM ?? rect.widthM;
      const heightM = patch.heightM ?? rect.heightM;
      const boundary = [{ x: origin.x, y: origin.y }, { x: origin.x + widthM, y: origin.y }, { x: origin.x + widthM, y: origin.y + heightM }, { x: origin.x, y: origin.y + heightM }];
      return { ...r, ...patch, origin, widthM, heightM, boundary, areaM2: polygonArea(boundary), perimeterM: polygonPerimeter(boundary), label: { x: origin.x + widthM / 2, y: origin.y + heightM / 2 } };
    })
  })),
  updateObstacle: (id, patch) => withProjectUpdate(set, get, (curr) => ({
    ...curr,
    obstacles: curr.obstacles.map((o) => {
      if (o.id !== id) return o;
      const rect = normalizeRectEntity({ origin: o.origin, widthM: o.widthM, heightM: o.heightM, polygon: o.polygon });
      const origin = patch.origin ?? rect.origin;
      const widthM = patch.widthM ?? rect.widthM;
      const heightM = patch.heightM ?? rect.heightM;
      const polygon = [{ x: origin.x, y: origin.y }, { x: origin.x + widthM, y: origin.y }, { x: origin.x + widthM, y: origin.y + heightM }, { x: origin.x, y: origin.y + heightM }];
      return { ...o, ...patch, origin, widthM, heightM, polygon };
    })
  })),
  updateOpening: (id, patch) => withProjectUpdate(set, get, (curr) => ({ ...curr, openings: curr.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  updateVertex: (id, patch) => withProjectUpdate(set, get, (curr) => ({ ...curr, wallVertices: curr.wallVertices.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
  updateEdge: (id, patch) => withProjectUpdate(set, get, (curr) => ({ ...curr, wallEdges: curr.wallEdges.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  updateRoomDivider: (id, patch) => withProjectUpdate(set, get, (curr) => ({ ...curr, roomDividers: (curr.roomDividers ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  updateFloorSymbol: (id, patch) => withProjectUpdate(set, get, (curr) => ({ ...curr, floorSymbols: (curr.floorSymbols ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
  updateEntityName: (id, name) => {
    const room = get().project.rooms.find((r) => r.id === id);
    if (room) get().updateRoom(id, { name });
    const divider = (get().project.roomDividers ?? []).find((d) => d.id === id);
    if (divider) get().updateRoomDivider(id, { name });
  },
  moveWall: (id, delta) => get().moveEdge(id, delta),
  moveVertex: (id, delta) => {
    const v = get().project.wallVertices.find((x) => x.id === id);
    if (!v || v.locked) return;
    withProjectUpdate(set, get, (curr) => ({ ...curr, wallVertices: curr.wallVertices.map((vv) => (vv.id === id ? { ...vv, x: vv.x + delta.x, y: vv.y + delta.y } : vv)) }));
  },
  moveEdge: (id, delta) => {
    const edge = get().project.wallEdges.find((e) => e.id === id);
    if (!edge || edge.locked) return;
    const byId = new Map(get().project.wallVertices.map((v) => [v.id, v]));
    const v1 = byId.get(edge.v1Id);
    const v2 = byId.get(edge.v2Id);
    if (!v1 || !v2 || v1.locked || v2.locked) return;
    withProjectUpdate(set, get, (curr) => ({ ...curr, wallVertices: curr.wallVertices.map((v) => (v.id === edge.v1Id || v.id === edge.v2Id ? { ...v, x: v.x + delta.x, y: v.y + delta.y } : v)) }));
  },
  moveRoom: (id, delta) => {
    const room = get().project.rooms.find((r) => r.id === id);
    if (!room || room.locked) return;
    const rect = normalizeRectEntity({ origin: room.origin, widthM: room.widthM, heightM: room.heightM, polygon: room.boundary });
    get().updateRoom(id, { origin: { x: rect.origin.x + delta.x, y: rect.origin.y + delta.y } });
  },
  moveObstacle: (id, delta) => {
    const obstacle = get().project.obstacles.find((o) => o.id === id);
    if (!obstacle || obstacle.locked) return;
    const rect = normalizeRectEntity({ origin: obstacle.origin, widthM: obstacle.widthM, heightM: obstacle.heightM, polygon: obstacle.polygon });
    get().updateObstacle(id, { origin: { x: rect.origin.x + delta.x, y: rect.origin.y + delta.y } });
  },
  moveOpeningAlongWall: (id, distanceAlongM) => {
    const { project } = get();
    const opening = project.openings.find((o) => o.id === id);
    if (!opening || opening.locked) return;
    const wall = project.walls.find((w) => w.id === opening.wallId);
    if (!wall) return;
    const len = measureDistance(wall.points[0], wall.points[1]);
    const half = opening.widthM / 2;
    get().updateOpening(id, { distanceAlongM: Math.max(half, Math.min(len - half, distanceAlongM)) });
  },
  moveRoomDivider: (id, delta) => {
    const divider = (get().project.roomDividers ?? []).find((d) => d.id === id);
    if (!divider || divider.locked) return;
    withProjectUpdate(set, get, (curr) => ({
      ...curr,
      roomDividers: (curr.roomDividers ?? []).map((d) => d.id === id ? { ...d, start: { x: d.start.x + delta.x, y: d.start.y + delta.y }, end: { x: d.end.x + delta.x, y: d.end.y + delta.y } } : d)
    }));
  },
  moveFloorSymbol: (id, delta) => {
    const sym = (get().project.floorSymbols ?? []).find((s) => s.id === id);
    if (!sym || sym.locked) return;
    withProjectUpdate(set, get, (curr) => ({
      ...curr,
      floorSymbols: (curr.floorSymbols ?? []).map((s) => s.id === id ? { ...s, position: { x: s.position.x + delta.x, y: s.position.y + delta.y } } : s)
    }));
  },
  setMeasure: (patch) => set((state) => ({ measure: { ...state.measure, ...patch } })),
  clearMeasure: () => set({ measure: { active: false } }),
  deleteSelection: () => {
    const { selectedId, selectedKind } = get();
    if (!selectedId) return;
    withProjectUpdate(set, get, (curr) => {
      if (selectedKind === 'vertex') {
        const removedEdgeIds = curr.wallEdges.filter((e) => e.v1Id === selectedId || e.v2Id === selectedId).map((e) => e.id);
        return { ...curr, wallVertices: curr.wallVertices.filter((v) => v.id !== selectedId), wallEdges: curr.wallEdges.filter((e) => e.v1Id !== selectedId && e.v2Id !== selectedId), openings: curr.openings.filter((o) => !removedEdgeIds.includes(o.wallId)) };
      }
      if (selectedKind === 'divider') return { ...curr, roomDividers: (curr.roomDividers ?? []).filter((d) => d.id !== selectedId) };
      if (selectedKind === 'symbol') return { ...curr, floorSymbols: (curr.floorSymbols ?? []).filter((s) => s.id !== selectedId) };
      const wallDeleted = curr.wallEdges.some((e) => e.id === selectedId);
      return {
        ...curr,
        wallEdges: curr.wallEdges.filter((e) => e.id !== selectedId),
        rooms: curr.rooms.filter((r) => r.id !== selectedId),
        obstacles: curr.obstacles.filter((o) => o.id !== selectedId),
        openings: curr.openings.filter((o) => o.id !== selectedId && (!wallDeleted || o.wallId !== selectedId))
      };
    });
    set({ selectedId: undefined, selectedKind: undefined });
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
  fitToScreen: () => {
    const { project, view } = get();
    const points: Vec2[] = [
      ...project.wallVertices.map((v) => ({ x: v.x, y: v.y })),
      ...project.rooms.flatMap((r) => r.boundary),
      ...project.obstacles.flatMap((o) => o.polygon),
      ...(project.roomDividers ?? []).flatMap((d) => [d.start, d.end]),
      ...(project.floorSymbols ?? []).map((s) => s.position)
    ];
    if (points.length === 0) {
      set({ view: { x: 0, y: 0, w: DEFAULT_VIEW_W_M, h: (DEFAULT_VIEW_W_M * view.h) / view.w, zoom: 1 / DEFAULT_VIEW_W_M } });
      return;
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padFactor = 1.15;
    const contentW = Math.max(0.5, maxX - minX) * padFactor;
    const contentH = Math.max(0.5, maxY - minY) * padFactor;
    const aspect = view.w / Math.max(1e-6, view.h);
    const viewH = contentH;
    const viewW = Math.max(contentW, viewH * aspect);
    const w = clamp(viewW, MIN_VIEW_SIZE_M, MAX_VIEW_SIZE_M);
    const h = w / aspect;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    set({ view: { x: cx - w / 2, y: cy - h / 2, w, h, zoom: 1 / w } });
  },
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  markSaved: () => set({ hasUnsavedChanges: false })
}));
