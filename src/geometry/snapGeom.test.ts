import { describe, expect, it } from 'vitest';
import { nearestMidpoint, nearestPointOnSegments, nearestVertex } from './snapGeom';

describe('snap picking', () => {
  it('finds nearest snap points', () => {
    const vertices = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(nearestVertex({ x: 0.1, y: 0 }, vertices)?.point).toEqual({ x: 0, y: 0 });
    const segs: [{ x: number; y: number }, { x: number; y: number }][] = [[{ x: 0, y: 0 }, { x: 2, y: 0 }]];
    expect(nearestMidpoint({ x: 1.2, y: 0.1 }, segs)?.point).toEqual({ x: 1, y: 0 });
    expect(nearestPointOnSegments({ x: 0.3, y: 0.7 }, segs)?.point.y).toBeCloseTo(0);
  });
});
