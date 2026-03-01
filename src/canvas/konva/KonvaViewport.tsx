import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import { useAppStore } from '../../model/store';
import KonvaGridLayer from './KonvaGridLayer';
import KonvaRulersOverlay from './KonvaRulersOverlay';
import KonvaSceneLayer from './KonvaSceneLayer';
import { screenToWorld, viewToStageTransform, withPanDelta, withZoomAtScreenPoint } from './ViewportTransform';

const KonvaViewport = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportPx, setViewportPx] = useState({ width: 1000, height: 700 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const {
    project,
    view,
    setView,
    selectedId,
    setSelected,
    activeTool
  } = useAppStore((s) => ({
    project: s.project,
    view: s.view,
    setView: s.setView,
    selectedId: s.selectedId,
    setSelected: s.setSelected,
    activeTool: s.activeTool
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = () => {
      const width = Math.max(320, Math.floor(el.clientWidth));
      const height = Math.max(240, Math.floor(el.clientHeight));
      setViewportPx({ width, height });
      const targetH = (view.w * height) / width;
      if (Math.abs(targetH - view.h) > 1e-6) {
        setView({ h: targetH });
      }
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [setView, view.h, view.w]);

  const transform = useMemo(() => viewToStageTransform(view, viewportPx), [view, viewportPx]);
  const projectSegments = useMemo(() => project.walls.flatMap((w) => w.points), [project.walls]);

  return (
    <div ref={containerRef} className="relative h-full rounded-lg bg-white shadow-panel">
      <Stage
        width={viewportPx.width}
        height={viewportPx.height}
        x={transform.x}
        y={transform.y}
        scaleX={transform.scale}
        scaleY={transform.scale}
        draggable
        onDragMove={(e) => {
          const node = e.target;
          const deltaPx = { x: node.x() - transform.x, y: node.y() - transform.y };
          setView(withPanDelta(view, deltaPx, viewportPx));
          node.position({ x: transform.x, y: transform.y });
        }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const screenPoint = {
            x: e.evt.clientX - rect.left,
            y: e.evt.clientY - rect.top
          };
          const factor = e.evt.deltaY > 0 ? 1.1 : 0.9;
          setView(withZoomAtScreenPoint(view, viewportPx, screenPoint, factor));
        }}
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const screenPoint = {
            x: e.evt.clientX - rect.left,
            y: e.evt.clientY - rect.top
          };
          setCursor(screenToWorld(screenPoint, view, viewportPx));
        }}
        onMouseDown={(e) => {
          if (activeTool !== 'select') return;
          if (e.target === e.target.getStage()) setSelected(undefined);
        }}
      >
        <KonvaGridLayer view={view} viewportPx={viewportPx} baseStepM={0.05} />
        <KonvaSceneLayer
          project={project}
          selectedId={selectedId}
          onSelect={(id) => {
            if (activeTool === 'select') setSelected(id);
          }}
        />
      </Stage>
      <KonvaRulersOverlay view={view} viewportPx={viewportPx} />
      <div className="absolute bottom-2 left-10 rounded bg-white/90 px-2 py-1 text-xs text-slate-700">
        {cursor ? `Cursor ${cursor.x.toFixed(2)}m, ${cursor.y.toFixed(2)}m · Zoom ${view.zoom.toFixed(2)}x` : 'Move cursor'}
      </div>
      <div className="absolute right-2 top-8 rounded bg-white/90 px-2 py-1 text-xs text-slate-600">{projectSegments.length} vertices</div>
    </div>
  );
};

export default KonvaViewport;
