import { describe, expect, it } from 'vitest';
import { exportProjectXml, importProjectXml } from './xml';
import type { Project } from '../model/types';

const sample: Project = {
  version: '1.1',
  units: 'm',
  meta: { name: 'A', created: '2024', modified: '2024' },
  settings: {
    defaultWallThicknessM: 0.15,
    defaultCeilingHeightM: 2.5,
    gridSizeM: 0.05,
    snapThresholdPx: 10,
    planOrigin: { x: 1, y: 2 }
  },
  walls: [{ id: 'w1', p1: { x: 0, y: 0 }, p2: { x: 1, y: 0 }, thicknessM: 0.15 }],
  rooms: [{ id: 'r1', name: 'Room', origin: { x: 0, y: 0 }, widthM: 4, heightM: 3, classification: 'internal' }],
  obstacles: [{ id: 'o1', type: 'no_go', polygon: [{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.2, y: 0.2 }] }],
  openings: [{ id: 'op1', wallId: 'w1', offsetAlongWallM: 0.5, widthM: 0.9, type: 'door' }]
};

describe('xml roundtrip', () => {
  it('exports and imports including settings', () => {
    const xml = exportProjectXml(sample);
    const parsed = importProjectXml(xml);
    expect(parsed.errors).toEqual([]);
    expect(parsed.project?.settings.gridSizeM).toBe(0.05);
    expect(parsed.project?.walls[0].id).toBe('w1');
    expect(parsed.project?.rooms[0].widthM).toBe(4);
  });
});
