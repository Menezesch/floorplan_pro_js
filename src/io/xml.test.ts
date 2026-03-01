import { describe, expect, it } from 'vitest';
import { exportProjectXml, importProjectXml } from './xml';
import type { Project } from '../model/types';

const sample: Project = {
  version: '1.0',
  units: 'm',
  meta: { name: 'A & B', created: '2024', modified: '2024', gridM: 0.1 },
  walls: [{ id: 'w1', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], thicknessM: 0.15, polygon: [], roomsLeft: [], roomsRight: [] }],
  rooms: [
    {
      id: 'r1',
      name: `Room "One" <north>`,
      classification: 'external',
      origin: { x: 0, y: 0 },
      widthM: 1,
      heightM: 1,
      boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      wallIds: [],
      areaM2: 1,
      perimeterM: 4
    }
  ],
  obstacles: [{ id: 'o1', type: 'no_go', origin: { x: 0, y: 0 }, widthM: 0.2, heightM: 0.2, polygon: [{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.2, y: 0.2 }, { x: 0, y: 0.2 }] }],
  openings: [{ id: 'op1', wallId: 'w1', distanceAlongM: 0.5, widthM: 0.9, type: 'door', orientation: 'left' }]
};

describe('xml roundtrip', () => {
  it('exports and imports with room classification and openings', () => {
    const xml = exportProjectXml(sample);
    const parsed = importProjectXml(xml);
    expect(parsed.errors).toEqual([]);
    expect(parsed.project?.rooms[0].classification).toBe('external');
    expect(parsed.project?.openings[0].distanceAlongM).toBeCloseTo(0.5, 6);
    expect(parsed.project?.openings[0].widthM).toBeCloseTo(0.9, 6);
  });

  it('escapes xml attributes', () => {
    const xml = exportProjectXml(sample);
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&lt;north&gt;');
  });

  it('imports older opening attributes for backward compatibility', () => {
    const xml = `<?xml version="1.0"?><project version="1.0" units="m"><meta name="P" created="1" modified="1" grid="0.1"/><walls><wall id="w1" thickness="0.15" roomsLeft="" roomsRight=""><centerline>0,0 1,0</centerline></wall></walls><rooms></rooms><obstacles></obstacles><openings><opening id="o1" wallId="w1" distanceAlong="0.2" width="1.2" type="window" orientation="left"/></openings></project>`;
    const parsed = importProjectXml(xml);
    expect(parsed.errors).toEqual([]);
    expect(parsed.project?.openings[0].distanceAlongM).toBeCloseTo(0.2, 6);
    expect(parsed.project?.openings[0].widthM).toBeCloseTo(1.2, 6);
  });
});
