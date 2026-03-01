import { useEffect, useMemo, useRef, useState } from 'react';
import Grid from './Grid';
import { metersToSvg, svgToWorld } from '../geometry/units';
import { useAppStore } from '../model/store';
import { applySnapping } from './Snap';

const SvgViewport = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const {
    project,
    activeTool,
    view,
    setView,
    addWallSegment,
    addRoomRect,
    addObstacleRect,
    addOpeningOnWall,
    setSelected,
    selectedId,
    snap,
    setPointerWorld,
    setSnapIndicator,
    setSnapActive,
    snapIndicator
  } = useAppStore();

  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const metersPerPixel = useMemo(() => {
    const widthPx = viewportRef.current?.clientWidth || 1;
    return view.w / widthPx / 100;
  }, [view.w]);

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const inv = svg.getScreenCTM()?.inverse();
    const p = inv ? point.matrixTransform(inv) : point;
    return svgToWorld({ x: p.x, y: p.y });
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.08 : 0.92;
      const cursorWorld = toWorld(event.clientX, event.clientY);
      setView((prev) => {
        const nextW = prev.w * factor;
        const nextH = prev.h * factor;
        const relX = (metersToSvg(cursorWorld.x) - prev.x) / prev.w;
        const relY = (metersToSvg(cursorWorld.y) - prev.y) / prev.h;
        return {
          ...prev,
          w: nextW,
          h: nextH,
          x: metersToSvg(cursorWorld.x) - relX * nextW,
          y: metersToSvg(cursorWorld.y) - relY * nextH,
          zoom: prev.zoom * (1 / factor)
        };
      });
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [setView]);

  const snappedPoint = (point: { x: number; y: number }) => {
    const snapped = applySnapping(point, project, snap, { metersPerPixel });
    setSnapActive(snapped.active);
    setSnapIndicator(snapped.point);
    return snapped.point;
  };

  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const snapped = snappedPoint(toWorld(event.clientX, event.clientY));

    if (activeTool === 'wall' || activeTool === 'room' || activeTool === 'obstacle') {
      setStart(snapped);
      return;
    }

    if (activeTool === 'window' || activeTool === 'door') {
      const wall = project.walls.find((w) => w.id === (event.target as SVGElement).dataset.id);
      if (wall) {
        addOpeningOnWall(wall.id, snapped, activeTool);
      }
      return;
    }

    if (activeTool === 'select') {
      const id = (event.target as SVGElement).dataset.id;
      setSelected(id);
    }
  };

  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const world = toWorld(event.clientX, event.clientY);
    setPointerWorld(world);
    setCursor(snappedPoint(world));
  };

  const onMouseUp: React.MouseEventHandler<SVGSVGElement> = (event) => {
    if (!start) return;
    const end = snappedPoint(toWorld(event.clientX, event.clientY));
    if (activeTool === 'wall') addWallSegment(start, end);
    if (activeTool === 'room') addRoomRect(start, end);
    if (activeTool === 'obstacle') addObstacleRect(start, end);
    setStart(null);
  };

  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;

  return (
    <div ref={viewportRef} className="relative h-full rounded-lg bg-white shadow-panel">
      <svg
        ref={svgRef}
        className="h-full w-full"
        viewBox={viewBox}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <Grid widthM={80} heightM={50} gridM={project.settings.gridSizeM} />

        {project.rooms.map((room) => (
          <rect
            key={room.id}
            data-id={room.id}
            x={metersToSvg(room.origin.x)}
            y={metersToSvg(room.origin.y)}
            width={metersToSvg(room.widthM)}
            height={metersToSvg(room.heightM)}
            fill={room.classification === 'internal' ? '#dbeafe99' : '#dcfce799'}
            stroke={selectedId === room.id ? '#1d4ed8' : '#334155'}
            strokeWidth={2}
          />
        ))}

        {project.walls.map((wall) => (
          <line
            key={wall.id}
            data-id={wall.id}
            x1={metersToSvg(wall.p1.x)}
            y1={metersToSvg(wall.p1.y)}
            x2={metersToSvg(wall.p2.x)}
            y2={metersToSvg(wall.p2.y)}
            stroke={selectedId === wall.id ? '#0f172a' : '#334155'}
            strokeWidth={Math.max(2, metersToSvg(wall.thicknessM))}
            strokeLinecap="round"
          />
        ))}

        {project.openings.map((opening) => {
          const wall = project.walls.find((item) => item.id === opening.wallId);
          if (!wall) return null;
          const length = Math.hypot(wall.p2.x - wall.p1.x, wall.p2.y - wall.p1.y) || 1;
          const ux = (wall.p2.x - wall.p1.x) / length;
          const uy = (wall.p2.y - wall.p1.y) / length;
          const cx = wall.p1.x + ux * opening.offsetAlongWallM;
          const cy = wall.p1.y + uy * opening.offsetAlongWallM;
          return (
            <circle
              key={opening.id}
              data-id={opening.id}
              cx={metersToSvg(cx)}
              cy={metersToSvg(cy)}
              r={opening.type === 'door' ? 6 : 5}
              fill={opening.type === 'door' ? '#f59e0b' : '#22c55e'}
              stroke="#0f172a"
              strokeWidth={1}
            />
          );
        })}

        {project.obstacles.map((obs) => (
          <polygon
            key={obs.id}
            data-id={obs.id}
            points={obs.polygon.map((p) => `${metersToSvg(p.x)},${metersToSvg(p.y)}`).join(' ')}
            fill="#f9731680"
            stroke="#ea580c"
            strokeDasharray="6 4"
          />
        ))}

        {start && cursor && (
          <line
            x1={metersToSvg(start.x)}
            y1={metersToSvg(start.y)}
            x2={metersToSvg(cursor.x)}
            y2={metersToSvg(cursor.y)}
            stroke="#2563eb"
            strokeDasharray="4 4"
            strokeWidth={2}
          />
        )}

        {snapIndicator && (
          <circle cx={metersToSvg(snapIndicator.x)} cy={metersToSvg(snapIndicator.y)} r={4} fill="#2563eb" />
        )}
      </svg>
    </div>
  );
};

export default SvgViewport;
