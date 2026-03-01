import { describe, expect, it } from 'vitest';
import { applySnapping } from './Snap';
import type { Project, SnapState } from '../model/types';

const baseProject: Project = {
  version: '1.0',
  units: 'm',
  meta: { name: 'p', created: 'x', modified: 'x', gridM: 0.1 },
  walls: [],
  wallVertices: [
    { id: 'v1', x: 0, y: 0 },
    { id: 'v2', x: 2, y: 0 }
  ],
  wallEdges: [{ id: 'e1', v1Id: 'v1', v2Id: 'v2', thicknessM: 0.15 }],
  rooms: [],
  obstacles: [],
  openings: []
};

const allSnap: SnapState = { grid: true, vertex: true, edge: true, midpoint: true };

describe('applySnapping', () => {
  it('uses priority vertex > edge > midpoint > grid', () => {
    const hit = applySnapping({ x: 0.02, y: 0.01 }, baseProject, allSnap, 0.05, 100, 10);
    expect(hit.kind).toBe('vertex');
    expect(hit.label).toBe('V');
  });

  it('falls back to grid with minimum 0.05m step', () => {
    const hit = applySnapping({ x: 0.13, y: 0.17 }, { ...baseProject, wallEdges: [], wallVertices: [] }, allSnap, 0.01, 50, 10);
    expect(hit.kind).toBe('grid');
    expect(hit.point.x).toBeCloseTo(0.15, 8);
    expect(hit.point.y).toBeCloseTo(0.15, 8);
  });

  it('respects pixel tolerance converted to meters', () => {
    const far = applySnapping({ x: 1.0, y: 0.4 }, baseProject, allSnap, 0.05, 10, 2);
    expect(far.kind).toBe('grid');
    const near = applySnapping({ x: 1.0, y: 0.03 }, baseProject, allSnap, 0.05, 100, 10);
    expect(near.kind).toBe('edge');
  });
});
