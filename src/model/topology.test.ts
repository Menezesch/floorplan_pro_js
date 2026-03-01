import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './store';
import type { Project } from './types';

const baseProject: Project = {
  version: '1.0',
  units: 'm',
  meta: { name: 'T', created: '1', modified: '1', gridM: 0.1 },
  walls: [],
  wallVertices: [],
  wallEdges: [],
  rooms: [],
  obstacles: [],
  openings: []
};

beforeEach(() => {
  useAppStore.getState().replaceProject(baseProject);
  useAppStore.setState({ selectedId: undefined, selectedKind: undefined });
});

describe('topology store', () => {
  it('merges vertices with epsilon-aligned tolerance', () => {
    const s = useAppStore.getState();
    s.addWallSegment({ x: 0, y: 0 }, { x: 1, y: 0 });
    s.addWallSegment({ x: 1.005, y: 0.002 }, { x: 2, y: 0 });
    const p = useAppStore.getState().project;
    expect(p.wallVertices.length).toBe(3);
    expect(p.wallEdges.length).toBe(2);
  });

  it('moving shared vertex updates connected edges', () => {
    const s = useAppStore.getState();
    s.addWallSegment({ x: 0, y: 0 }, { x: 1, y: 0 });
    s.addWallSegment({ x: 1, y: 0 }, { x: 1, y: 1 });
    const p = useAppStore.getState().project;
    const shared = p.wallVertices.find((v) => Math.abs(v.x - 1) < 1e-6 && Math.abs(v.y) < 1e-6);
    expect(shared).toBeTruthy();
    s.moveVertex(shared!.id, { x: 0.5, y: 0.25 });
    const p2 = useAppStore.getState().project;
    const moved = p2.wallVertices.find((v) => v.id === shared!.id)!;
    expect(moved.x).toBeCloseTo(1.5, 6);
    expect(moved.y).toBeCloseTo(0.25, 6);
  });

  it('moving edge translates both endpoint vertices', () => {
    const s = useAppStore.getState();
    const edgeId = s.addWallSegment({ x: 0, y: 0 }, { x: 1, y: 0 });
    const prev = useAppStore.getState().project.walls.find((w) => w.id === edgeId)!;
    s.moveEdge(edgeId, { x: 1, y: 1 });
    const next = useAppStore.getState().project.walls.find((w) => w.id === edgeId)!;
    expect(next.points[0].x - prev.points[0].x).toBeCloseTo(1, 6);
    expect(next.points[0].y - prev.points[0].y).toBeCloseTo(1, 6);
    expect(next.points[1].x - prev.points[1].x).toBeCloseTo(1, 6);
    expect(next.points[1].y - prev.points[1].y).toBeCloseTo(1, 6);
  });

  it('clamps opening offsets inside wall extents', () => {
    const s = useAppStore.getState();
    const edgeId = s.addWallSegment({ x: 0, y: 0 }, { x: 5, y: 0 });
    const openingId = s.addOpeningToWall(edgeId, 'door', 0.01, 0.9)!;
    let opening = useAppStore.getState().project.openings.find((o) => o.id === openingId)!;
    expect(opening.distanceAlongM).toBeCloseTo(0.45, 6);
    s.moveOpeningAlongWall(openingId, 100);
    opening = useAppStore.getState().project.openings.find((o) => o.id === openingId)!;
    expect(opening.distanceAlongM).toBeCloseTo(4.55, 6);
  });
});
