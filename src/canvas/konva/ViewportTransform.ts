export interface ViewportView {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
}

export interface StageTransform {
  x: number;
  y: number;
  scale: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export const MIN_VIEW_SIZE_M = 2;
export const MAX_VIEW_SIZE_M = 200;
export const WORLD_MIN = -100;
export const WORLD_MAX = 100;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clampViewBounds = (view: ViewportView): ViewportView => {
  const maxX = WORLD_MAX - view.w;
  const maxY = WORLD_MAX - view.h;
  return {
    ...view,
    x: clamp(view.x, WORLD_MIN, maxX),
    y: clamp(view.y, WORLD_MIN, maxY)
  };
};

export const viewToStageTransform = (view: ViewportView, viewportPx: { width: number; height: number }): StageTransform => {
  const bounded = clampViewBounds(view);
  const scale = viewportPx.width / bounded.w;
  return { x: -bounded.x * scale, y: -bounded.y * scale, scale };
};

export const worldToScreen = (world: Vec2, view: ViewportView, viewportPx: { width: number; height: number }): Vec2 => {
  const t = viewToStageTransform(view, viewportPx);
  return { x: world.x * t.scale + t.x, y: world.y * t.scale + t.y };
};

export const screenToWorld = (screen: Vec2, view: ViewportView, viewportPx: { width: number; height: number }): Vec2 => {
  const t = viewToStageTransform(view, viewportPx);
  return { x: (screen.x - t.x) / t.scale, y: (screen.y - t.y) / t.scale };
};

export const withPanDelta = (view: ViewportView, deltaPx: Vec2, viewportPx: { width: number; height: number }): ViewportView => {
  const metersPerPixel = view.w / viewportPx.width;
  return clampViewBounds({ ...view, x: view.x - deltaPx.x * metersPerPixel, y: view.y - deltaPx.y * metersPerPixel });
};

export const withZoomAtScreenPoint = (view: ViewportView, viewportPx: { width: number; height: number }, screenPoint: Vec2, zoomFactor: number): ViewportView => {
  const nextW = clamp(view.w * zoomFactor, MIN_VIEW_SIZE_M, MAX_VIEW_SIZE_M);
  const nextH = (nextW * viewportPx.height) / viewportPx.width;
  const worldBefore = screenToWorld(screenPoint, view, viewportPx);
  const next: ViewportView = { ...view, w: nextW, h: nextH, zoom: 1 / nextW };
  const worldAfter = screenToWorld(screenPoint, next, viewportPx);
  return clampViewBounds({ ...next, x: next.x + (worldBefore.x - worldAfter.x), y: next.y + (worldBefore.y - worldAfter.y) });
};

export const getGridStepWithLod = (baseStepM: number, pixelsPerMeter: number, minSpacingPx = 8): number => {
  const steps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const safeBase = Math.max(0.00001, baseStepM);
  const startIndex = Math.max(0, steps.findIndex((s) => s >= safeBase));
  for (let i = startIndex; i < steps.length; i += 1) if (steps[i] * pixelsPerMeter >= minSpacingPx) return steps[i];
  return steps[steps.length - 1];
};
