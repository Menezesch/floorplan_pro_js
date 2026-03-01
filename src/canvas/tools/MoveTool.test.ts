import { describe, expect, it, vi } from 'vitest';
import { createMoveToolHandlers } from './MoveTool';
import type { ToolActions, ToolContext } from './shared';
import type { Project } from '../../model/types';

const project: Project = {
  version: '1.0',
  units: 'm',
  meta: { name: 'p', created: 'x', modified: 'x', gridM: 0.1 },
  walls: [{ id: 'e1', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }], thicknessM: 0.15, polygon: [], roomsLeft: [], roomsRight: [] }],
  wallVertices: [{ id: 'v1', x: 0, y: 0 }, { id: 'v2', x: 2, y: 0 }],
  wallEdges: [{ id: 'e1', v1Id: 'v1', v2Id: 'v2', thicknessM: 0.15 }],
  rooms: [],
  obstacles: [],
  openings: []
};

const baseCtx = (overrides: Partial<ToolContext>): ToolContext => ({
  tool: 'move',
  rawWorld: { x: 0, y: 0 },
  snapped: { point: { x: 0, y: 0 }, kind: 'grid', label: 'G' },
  pixelsPerMeter: 100,
  project,
  snapState: { grid: true, vertex: true, edge: true, midpoint: true },
  hit: { kind: 'vertex', id: 'v1' },
  shiftKey: false,
  ...overrides
});

describe('MoveTool', () => {
  it('uses snapped point for vertex drag delta', () => {
    const moveVertex = vi.fn();
    const actions = {
      setSelected: vi.fn(),
      setWallDraft: vi.fn(),
      getWallDraft: vi.fn(),
      setRectDraft: vi.fn(),
      getRectDraft: vi.fn(),
      setPreviewLabel: vi.fn(),
      addWallSegment: vi.fn(),
      addRoomRect: vi.fn(),
      addObstacleRect: vi.fn(),
      addOpeningToWall: vi.fn(),
      moveVertex,
      moveEdge: vi.fn(),
      moveRoom: vi.fn(),
      moveObstacle: vi.fn(),
      moveOpeningAlongWall: vi.fn(),
      setMeasure: vi.fn(),
      clearMeasure: vi.fn()
    } as unknown as ToolActions;

    const handlers = createMoveToolHandlers();
    handlers.onPointerDown?.(baseCtx({ hit: { kind: 'vertex', id: 'v1' }, snapped: { point: { x: 1, y: 1 }, kind: 'vertex', label: 'V' } }), actions);
    handlers.onPointerMove?.(baseCtx({ snapped: { point: { x: 1.2, y: 1.4 }, kind: 'grid', label: 'G' } }), actions);
    expect(moveVertex).toHaveBeenCalledTimes(1);
    const [, delta] = moveVertex.mock.calls[0];
    expect(delta.x).toBeCloseTo(0.2, 8);
    expect(delta.y).toBeCloseTo(0.4, 8);
  });
});
