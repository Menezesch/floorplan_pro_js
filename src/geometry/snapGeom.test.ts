import { describe, expect, it } from 'vitest';
import { nearestVertex, snapToGrid } from './snapGeom';

describe('snap picking', () => {
  it('finds nearest vertex', () => {
    const vertices = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(nearestVertex({ x: 0.1, y: 0 }, vertices)?.point).toEqual({ x: 0, y: 0 });
  });

  it('snaps grid to 0.05m increments', () => {
    const hit = snapToGrid({ x: 0.123, y: 0.277 }, 0.05);
    expect(hit.point.x).toBeCloseTo(0.1);
    expect(hit.point.y).toBeCloseTo(0.3);
  });
});
