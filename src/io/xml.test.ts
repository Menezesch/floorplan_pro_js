import { describe, expect, it } from 'vitest';
import { exportProjectXml, importProjectXml } from './xml';
import type { Project } from '../model/types';

const sample: Project = {
  version: '1.0',
  units: 'm',
  meta: { name: 'A', created: '2024', modified: '2024', gridM: 0.1 },
  walls: [{ id: 'w1', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], thicknessM: 0.1, polygon: [], roomsLeft: [], roomsRight: [] }],
  rooms: [{ id: 'r1', name: 'Room', boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], wallIds: [], areaM2: 1, perimeterM: 3 }],
  obstacles: [{ id: 'o1', type: 'no_go', polygon: [{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.2, y: 0.2 }] }],
  openings: []
};

describe('xml roundtrip', () => {
  it('exports and imports', () => {
    const xml = exportProjectXml(sample);
    const parsed = importProjectXml(xml);
    expect(parsed.errors).toEqual([]);
    expect(parsed.project?.walls[0].id).toBe('w1');
    expect(parsed.project?.rooms[0].name).toBe('Room');
  });
});
