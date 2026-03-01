import type { ViewportView } from './ViewportTransform';
import { getGridStepWithLod } from './ViewportTransform';

interface Props {
  view: ViewportView;
  viewportPx: { width: number; height: number };
}

const KonvaRulersOverlay = ({ view, viewportPx }: Props) => {
  const pixelsPerMeter = viewportPx.width / view.w;
  const step = getGridStepWithLod(0.05, pixelsPerMeter, 40);
  const topTicks = [];
  const leftTicks = [];

  const startX = Math.floor(view.x / step) * step;
  const endX = view.x + view.w;
  for (let x = startX; x <= endX + step * 0.5; x += step) {
    const px = (x - view.x) * pixelsPerMeter;
    topTicks.push(
      <div key={`tx-${x}`} className="absolute top-0 h-5 border-l border-slate-300" style={{ left: `${px}px` }}>
        <span className="absolute left-1 top-0 text-[10px] text-slate-500">{x.toFixed(2)}</span>
      </div>
    );
  }

  const startY = Math.floor(view.y / step) * step;
  const endY = view.y + view.h;
  for (let y = startY; y <= endY + step * 0.5; y += step) {
    const py = (y - view.y) * pixelsPerMeter;
    leftTicks.push(
      <div key={`ly-${y}`} className="absolute left-0 w-8 border-t border-slate-300" style={{ top: `${py}px` }}>
        <span className="absolute left-0 top-0 text-[10px] text-slate-500">{y.toFixed(2)}</span>
      </div>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute left-8 right-0 top-0 h-5 overflow-hidden bg-white/90">{topTicks}</div>
      <div className="pointer-events-none absolute bottom-0 left-0 top-5 w-8 overflow-hidden bg-white/90">{leftTicks}</div>
      <div className="pointer-events-none absolute left-0 top-0 h-5 w-8 bg-white/95" />
    </>
  );
};

export default KonvaRulersOverlay;
