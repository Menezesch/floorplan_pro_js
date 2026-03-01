import { useMemo, useRef, useState } from 'react';
import Grid from './Grid';
import { metersToSvg, svgToWorld } from '../geometry/units';
import { useAppStore } from '../model/store';
import { applySnapping } from './Snap';
import { measureDistance } from '../geometry/measure';

const SvgViewport = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const {
    project,
    activeTool,
    view,
    setView,
    addWallSegment,
    addRoomRect,
    addObstacle,
    setSelected,
    selectedId,
    snap
  } = useAppStore();
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [obstacleDraft, setObstacleDraft] = useState<{ x: number; y: number }[]>([]);

  const projectSegments = useMemo(() => project.walls.flatMap((w) => w.points), [project.walls]);

  const toWorld = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const inv = svg.getScreenCTM()?.inverse();
    const p = inv ? point.matrixTransform(inv) : point;
    return svgToWorld({ x: p.x, y: p.y });
  };

  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setView({ w: view.w * factor, h: view.h * factor, zoom: 1 / factor });
  };

  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const raw = toWorld(e);
    const snapped = applySnapping(raw, project, snap, project.meta.gridM);
    if (activeTool === 'wall' || activeTool === 'roomRect' || activeTool === 'measure') setStart(snapped);
    if (activeTool === 'obstacle') {
      if (e.detail === 2 && obstacleDraft.length >= 3) {
        addObstacle(obstacleDraft);
        setObstacleDraft([]);
      } else {
        setObstacleDraft((prev) => [...prev, snapped]);
      }
    }
    if (activeTool === 'select') {
      const wall = project.walls.find((w) => w.id === (e.target as SVGElement).dataset.id);
      const room = project.rooms.find((r) => r.id === (e.target as SVGElement).dataset.id);
      const obstacle = project.obstacles.find((o) => o.id === (e.target as SVGElement).dataset.id);
      setSelected(wall?.id ?? room?.id ?? obstacle?.id);
    }
  };

  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const raw = toWorld(e);
    setCursor(raw);
  };

  const onMouseUp: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!start) return;
    const end = applySnapping(toWorld(e), project, snap, project.meta.gridM);
    if (activeTool === 'wall') addWallSegment(start, end);
    if (activeTool === 'roomRect') addRoomRect(start, end);
    setStart(null);
  };

  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;

  return (
    <div className="relative h-full rounded-lg bg-white shadow-panel">
      <svg ref={svgRef} className="h-full w-full" viewBox={viewBox} onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        <Grid widthM={50} heightM={30} gridM={project.meta.gridM} />
        {project.rooms.map((room) => (
          <polygon key={room.id} data-id={room.id} points={room.boundary.map((p) => `${metersToSvg(p.x)},${metersToSvg(p.y)}`).join(' ')} fill="#dbeafe66" stroke="#1d4ed8" strokeWidth={2} />
        ))}
        {project.walls.map((wall) => (
          <polygon key={wall.id} data-id={wall.id} points={wall.polygon.map((p) => `${metersToSvg(p.x)},${metersToSvg(p.y)}`).join(' ')} fill={selectedId === wall.id ? '#2563eb' : '#1f2937'} fillOpacity={0.9} />
        ))}
        {project.obstacles.map((obs) => (
          <polygon key={obs.id} data-id={obs.id} points={obs.polygon.map((p) => `${metersToSvg(p.x)},${metersToSvg(p.y)}`).join(' ')} fill="#f9731688" stroke="#ea580c" strokeDasharray="8 6" />
        ))}
        {start && cursor && activeTool === 'measure' && (
          <>
            <line x1={metersToSvg(start.x)} y1={metersToSvg(start.y)} x2={metersToSvg(cursor.x)} y2={metersToSvg(cursor.y)} stroke="#16a34a" strokeWidth={2} />
            <text x={metersToSvg((start.x + cursor.x) / 2)} y={metersToSvg((start.y + cursor.y) / 2)} fill="#166534" fontSize={20}>
              {measureDistance(start, cursor).toFixed(2)} m
            </text>
          </>
        )}
        {obstacleDraft.length > 1 && (
          <polyline points={obstacleDraft.map((p) => `${metersToSvg(p.x)},${metersToSvg(p.y)}`).join(' ')} stroke="#f59e0b" strokeWidth={2} fill="none" />
        )}
      </svg>
      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs text-slate-700">
        {cursor ? `Cursor ${cursor.x.toFixed(2)}m, ${cursor.y.toFixed(2)}m · Zoom ${view.zoom.toFixed(2)}x` : 'Move cursor'}
      </div>
      <div className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs text-slate-600">{projectSegments.length} vertices</div>
    </div>
  );
};

export default SvgViewport;
