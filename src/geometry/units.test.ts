import { describe, expect, it } from 'vitest';
import { metersToSvg, svgToMeters, worldToSvg } from './units';

describe('units conversion', () => {
  it('converts meters to svg and back', () => {
    expect(metersToSvg(2)).toBe(200);
    expect(svgToMeters(350)).toBe(3.5);
    expect(worldToSvg({ x: 1.2, y: 0.5 })).toEqual({ x: 120, y: 50 });
  });
});
