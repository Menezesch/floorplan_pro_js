import { describe, expect, it } from 'vitest';
import { wallSegmentToPolygon } from './polylineOffset';

describe('wall offset polygon', () => {
  it('builds rectangle around segment', () => {
    const poly = wallSegmentToPolygon({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.2);
    expect(poly).toHaveLength(4);
    expect(poly[0].y).toBeCloseTo(0.1);
    expect(poly[2].y).toBeCloseTo(-0.1);
  });
});
