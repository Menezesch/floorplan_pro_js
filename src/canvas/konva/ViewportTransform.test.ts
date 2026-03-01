import { describe, expect, it } from 'vitest';
import { screenToWorld, withPanDelta, withZoomAtScreenPoint, worldToScreen } from './ViewportTransform';

describe('ViewportTransform', () => {
  const viewport = { width: 1200, height: 800 };
  const view = { x: 2, y: 3, w: 24, h: 16, zoom: 1 / 24 };

  it('roundtrips world -> screen -> world', () => {
    const world = { x: 12.345, y: 9.876 };
    const screen = worldToScreen(world, view, viewport);
    const nextWorld = screenToWorld(screen, view, viewport);
    expect(nextWorld.x).toBeCloseTo(world.x, 8);
    expect(nextWorld.y).toBeCloseTo(world.y, 8);
  });

  it('keeps world point under cursor invariant while zooming', () => {
    const cursor = { x: 500, y: 340 };
    const worldBefore = screenToWorld(cursor, view, viewport);
    const zoomed = withZoomAtScreenPoint(view, viewport, cursor, 0.8);
    const worldAfter = screenToWorld(cursor, zoomed, viewport);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 8);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 8);
  });

  it('applies pan deltas in pixels correctly to world top-left', () => {
    const panned = withPanDelta(view, { x: 60, y: -40 }, viewport);
    const metersPerPixel = view.w / viewport.width;
    expect(panned.x).toBeCloseTo(view.x - 60 * metersPerPixel, 8);
    expect(panned.y).toBeCloseTo(view.y + 40 * metersPerPixel, 8);
  });
});
