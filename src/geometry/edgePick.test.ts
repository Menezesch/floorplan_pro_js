import { describe, expect, it } from 'vitest';
import { pickNearestEdge } from './edgePick';
import type { Project } from '../model/types';

const project: Project = {
  version: '1.0',
  units: 'm',
  meta: { name: 'p', created: 'x', modified: 'x', gridM: 0.1 },
  walls: [],
  wallVertices: [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 5, y: 0 },
    { id: 'c', x: 0, y: 2 },
    { id: 'd', x: 5, y: 2 }
  ],
  wallEdges: [
    { id: 'e1', v1Id: 'a', v2Id: 'b', thicknessM: 0.15 },
    { id: 'e2', v1Id: 'c', v2Id: 'd', thicknessM: 0.15 }
  ],
  rooms: [],
  obstacles: [],
  openings: []
};

describe('pickNearestEdge', () => {
  it('chooses nearest edge within tolerance', () => {
    const picked = pickNearestEdge(project, { x: 2, y: 0.15 }, 0.3);
    expect(picked?.edgeId).toBe('e1');
  });

  it('returns undefined when point is outside tolerance', () => {
    const picked = pickNearestEdge(project, { x: 2, y: 1 }, 0.2);
    expect(picked).toBeUndefined();
  });
});
