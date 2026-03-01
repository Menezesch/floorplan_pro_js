import { describe, expect, it } from 'vitest';
import { detectAxisAlignedRectangle } from './rectangleDetection';

describe('rectangle detection', () => {
  it('detects closed 4-wall axis-aligned rectangle', () => {
    const room = detectAxisAlignedRectangle([
      { id: 'w1', p1: { x: 0, y: 0 }, p2: { x: 4, y: 0 }, thicknessM: 0.15 },
      { id: 'w2', p1: { x: 4, y: 0 }, p2: { x: 4, y: 3 }, thicknessM: 0.15 },
      { id: 'w3', p1: { x: 4, y: 3 }, p2: { x: 0, y: 3 }, thicknessM: 0.15 },
      { id: 'w4', p1: { x: 0, y: 3 }, p2: { x: 0, y: 0 }, thicknessM: 0.15 }
    ]);
    expect(room?.widthM).toBe(4);
    expect(room?.heightM).toBe(3);
  });
});
