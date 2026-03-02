import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import { useAppStore } from '../../model/store';
import KonvaGridLayer from './KonvaGridLayer';
import KonvaRulersOverlay from './KonvaRulersOverlay';
import KonvaSceneLayer from './KonvaSceneLayer';
import { screenToWorld, viewToStageTransform, withPanDelta, withZoomAtScreenPoint, worldToScreen } from './ViewportTransform';
import { applySnapping, type SnapResult } from '../Snap';
import SnapOverlay from './SnapOverlay';
import { createToolHandlers } from '../tools/ToolController';
import type { HitEntity, ToolActions, ToolContext } from '../tools/shared';
import ZoomControls from '../../components/ZoomControls';

const KonvaViewport = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportPx, setViewportPx] = useState({ width: 1000, height: 700 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [wallDraft, setWallDraft] = useState<{ start: { x: number; y: number }; end?: { x: number; y: number } } | null>(null);
  const [dividerDraft, setDividerDraftState] = useState<{ start: { x: number; y: number }; end?: { x: number; y: number } } | null>(null);
  const [rectDraft, setRectDraftState] = useState<{ start: { x: number; y: number }; end: { x: number; y: number }; kind: 'roomRect' | 'obstacle' } | null>(null);
  const [previewLabel, setPreviewLabelState] = useState<{ text: string; point: { x: number; y: number } } | null>(null);
  const [hoveredVertexId, setHoveredVertexId] = useState<string | undefined>();
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const [panLast, setPanLast] = useState<{ x: number; y: number } | null>(null);

  // Pinch-to-zoom pointer tracking
  const pinchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const {
    project,
    view,
    setView,
    selectedId,
    selectedKind,
    setSelected,
    activeTool,
    activeSymbolType,
    snap,
    gridVisible,
    addWallSegment,
    addRoomRect,
    addObstacleRect,
    addOpeningToWall,
    addRoomDivider,
    addFloorSymbol,
    moveVertex,
    moveEdge,
    moveRoom,
    moveObstacle,
    moveOpeningAlongWall,
    moveRoomDivider,
    moveFloorSymbol,
    measure,
    setMeasure,
    clearMeasure
  } = useAppStore((s) => ({
    project: s.project,
    view: s.view,
    setView: s.setView,
    selectedId: s.selectedId,
    selectedKind: s.selectedKind,
    setSelected: s.setSelected,
    activeTool: s.activeTool,
    activeSymbolType: s.activeSymbolType,
    snap: s.snap,
    gridVisible: s.gridVisible,
    addWallSegment: s.addWallSegment,
    addRoomRect: s.addRoomRect,
    addObstacleRect: s.addObstacleRect,
    addOpeningToWall: s.addOpeningToWall,
    addRoomDivider: s.addRoomDivider,
    addFloorSymbol: s.addFloorSymbol,
    moveVertex: s.moveVertex,
    moveEdge: s.moveEdge,
    moveRoom: s.moveRoom,
    moveObstacle: s.moveObstacle,
    moveOpeningAlongWall: s.moveOpeningAlongWall,
    moveRoomDivider: s.moveRoomDivider,
    moveFloorSymbol: s.moveFloorSymbol,
    measure: s.measure,
    setMeasure: s.setMeasure,
    clearMeasure: s.clearMeasure
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const width = Math.max(320, Math.floor(el.clientWidth));
      const height = Math.max(240, Math.floor(el.clientHeight));
      setViewportPx({ width, height });
      const targetH = (view.w * height) / width;
      if (Math.abs(targetH - view.h) > 1e-6) setView({ h: targetH });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [setView, view.h, view.w]);

  const transform = useMemo(() => viewToStageTransform(view, viewportPx), [view, viewportPx]);
  const projectSegments = useMemo(() => project.wallEdges.length, [project.wallEdges.length]);
  const pixelsPerMeter = viewportPx.width / view.w;
  const handlers = useMemo(() => createToolHandlers(activeTool), [activeTool]);

  const parseHit = (evtTarget: unknown): HitEntity => {
    const attrs = (evtTarget as { attrs?: Record<string, unknown> })?.attrs;
    const entityType = attrs?.entityType;
    const entityId = attrs?.entityId;
    if (
      typeof entityType === 'string' &&
      typeof entityId === 'string' &&
      (entityType === 'vertex' || entityType === 'edge' || entityType === 'room' || entityType === 'obstacle' || entityType === 'opening' || entityType === 'divider' || entityType === 'symbol')
    ) return { kind: entityType, id: entityId };
    return { kind: 'none' };
  };

  const getContext = (e: { evt: MouseEvent; target: unknown }): ToolContext | undefined => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const screenPoint = { x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top };
    const rawWorld = screenToWorld(screenPoint, view, viewportPx);
    const snapped = applySnapping(rawWorld, project, snap, project.meta.gridM, pixelsPerMeter, 10);
    setCursor(rawWorld);
    const nearVertex = project.wallVertices.find((v) => Math.hypot(v.x - rawWorld.x, v.y - rawWorld.y) <= 8 / pixelsPerMeter);
    setHoveredVertexId(nearVertex?.id);
    setSnapResult(snapped);
    return { tool: activeTool, rawWorld, snapped, pixelsPerMeter, project, snapState: snap, hit: parseHit(e.target), selectedId, selectedKind, shiftKey: e.evt.shiftKey, activeSymbolType };
  };

  const actions: ToolActions = useMemo(
    () => ({
      setSelected,
      setWallDraft: (start, end) => setWallDraft(start ? { start, end: end ?? undefined } : null),
      getWallDraft: () => wallDraft,
      setDividerDraft: (start, end) => setDividerDraftState(start ? { start, end: end ?? undefined } : null),
      getDividerDraft: () => dividerDraft,
      setRectDraft: (start, end, kind) => setRectDraftState(start && end && kind ? { start, end, kind } : null),
      getRectDraft: () => rectDraft,
      setPreviewLabel: (text, point) => setPreviewLabelState(text && point ? { text, point } : null),
      addWallSegment,
      addRoomRect,
      addObstacleRect,
      addOpeningToWall,
      addRoomDivider,
      addFloorSymbol,
      moveVertex,
      moveEdge,
      moveRoom,
      moveObstacle,
      moveOpeningAlongWall,
      moveRoomDivider,
      moveFloorSymbol,
      setMeasure: (start, end, active) => setMeasure({ start, end, active }),
      clearMeasure
    }),
    [setSelected, wallDraft, dividerDraft, rectDraft, addWallSegment, addRoomRect, addObstacleRect, addOpeningToWall, addRoomDivider, addFloorSymbol, moveVertex, moveEdge, moveRoom, moveObstacle, moveOpeningAlongWall, moveRoomDivider, moveFloorSymbol, setMeasure, clearMeasure]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handlers.onKeyDown?.(e, actions);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, actions]);

  // Pinch-to-zoom handlers on the container div
  const onContainerPointerDown = (e: React.PointerEvent) => {
    pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onContainerPointerMove = (e: React.PointerEvent) => {
    if (!pinchPointersRef.current.has(e.pointerId)) return;
    const prev = new Map(pinchPointersRef.current);
    pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchPointersRef.current.size !== 2) return;
    const [a, b] = [...pinchPointersRef.current.values()];
    const [pa, pb] = [...prev.values()];
    const prevDist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    const newDist = Math.hypot(a.x - b.x, a.y - b.y);
    if (prevDist < 1 || newDist < 1) return;
    const factor = prevDist / newDist;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const midX = (a.x + b.x) / 2 - rect.left;
    const midY = (a.y + b.y) / 2 - rect.top;
    setView(withZoomAtScreenPoint(view, viewportPx, { x: midX, y: midY }, factor));
  };
  const onContainerPointerUp = (e: React.PointerEvent) => {
    pinchPointersRef.current.delete(e.pointerId);
  };

  const snapScreen = snapResult ? worldToScreen(snapResult.point, view, viewportPx) : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full rounded-lg bg-white shadow-panel"
      onPointerDown={onContainerPointerDown}
      onPointerMove={onContainerPointerMove}
      onPointerUp={onContainerPointerUp}
      onPointerCancel={onContainerPointerUp}
    >
      <Stage
        width={viewportPx.width}
        height={viewportPx.height}
        x={transform.x}
        y={transform.y}
        scaleX={transform.scale}
        scaleY={transform.scale}
        onWheel={(e) => {
          e.evt.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const screenPoint = { x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top };
          const factor = e.evt.deltaY > 0 ? 1.08 : 0.92;
          setView(withZoomAtScreenPoint(view, viewportPx, screenPoint, factor));
        }}
        onMouseMove={(e) => {
          const evt = e.evt as MouseEvent;
          if (isMiddlePanning && (evt.buttons & 4) && panLast) {
            const deltaPx = { x: evt.clientX - panLast.x, y: evt.clientY - panLast.y };
            setView(withPanDelta(view, deltaPx, viewportPx));
            setPanLast({ x: evt.clientX, y: evt.clientY });
            return;
          }
          const ctx = getContext({ evt, target: e.target });
          if (ctx) handlers.onPointerMove?.(ctx, actions);
        }}
        onMouseDown={(e) => {
          const evt = e.evt as MouseEvent;
          if (evt.button === 1 || evt.buttons === 4) {
            setIsMiddlePanning(true);
            setPanLast({ x: evt.clientX, y: evt.clientY });
            return;
          }
          const ctx = getContext({ evt, target: e.target });
          if (ctx) handlers.onPointerDown?.(ctx, actions);
        }}
        onMouseUp={(e) => {
          const evt = e.evt as MouseEvent;
          if (isMiddlePanning) {
            setIsMiddlePanning(false);
            setPanLast(null);
            return;
          }
          const ctx = getContext({ evt, target: e.target });
          if (ctx) handlers.onPointerUp?.(ctx, actions);
        }}
      >
        {gridVisible && <KonvaGridLayer view={view} viewportPx={viewportPx} baseStepM={0.05} />}
        <KonvaSceneLayer
          project={project}
          selectedId={selectedId}
          selectedKind={selectedKind}
          activeTool={activeTool}
          hoveredVertexId={hoveredVertexId}
          vertexHandleRadius={4 / pixelsPerMeter}
          wallDraft={wallDraft ?? undefined}
          dividerDraft={dividerDraft}
          rectDraft={rectDraft}
          measureDraft={measure}
          onSelect={setSelected}
        />
      </Stage>
      <KonvaRulersOverlay view={view} viewportPx={viewportPx} />
      {snapScreen && <SnapOverlay snap={snapResult} leftPx={snapScreen.x} topPx={snapScreen.y} />}
      {previewLabel && (
        <div
          className="pointer-events-none absolute rounded bg-white/90 px-2 py-1 text-xs text-slate-700"
          style={{ left: `${worldToScreen(previewLabel.point, view, viewportPx).x + 8}px`, top: `${worldToScreen(previewLabel.point, view, viewportPx).y + 8}px` }}
        >
          {previewLabel.text}
        </div>
      )}
      {/* Status bar (bottom-left) */}
      <div className="absolute bottom-2 left-10 rounded bg-white/90 px-2 py-1 text-xs text-slate-700">
        {cursor ? `${cursor.x.toFixed(2)}m, ${cursor.y.toFixed(2)}m` : 'Move cursor'}
      </div>
      {/* Edge count (top-right) */}
      <div className="absolute right-2 top-8 rounded bg-white/90 px-2 py-1 text-xs text-slate-600">{projectSegments} edges</div>
      {/* Zoom controls (bottom-right) — Item 7 */}
      <ZoomControls view={view} setView={setView} viewportPx={viewportPx} />
    </div>
  );
};

export default KonvaViewport;
