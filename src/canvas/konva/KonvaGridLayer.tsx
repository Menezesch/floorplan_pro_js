import { Layer, Line } from 'react-konva';
import type { ViewportView } from './ViewportTransform';
import { getGridStepWithLod } from './ViewportTransform';

interface Props {
  view: ViewportView;
  viewportPx: { width: number; height: number };
  baseStepM?: number;
}

const KonvaGridLayer = ({ view, viewportPx, baseStepM = 0.05 }: Props) => {
  const pixelsPerMeter = viewportPx.width / view.w;
  const step = getGridStepWithLod(baseStepM, pixelsPerMeter, 8);
  const startX = Math.floor(view.x / step) * step;
  const endX = view.x + view.w;
  const startY = Math.floor(view.y / step) * step;
  const endY = view.y + view.h;

  const vertical = [];
  for (let x = startX; x <= endX + step * 0.5; x += step) {
    vertical.push(<Line key={`vx-${x}`} points={[x, startY, x, endY]} stroke="#dbeafe" strokeWidth={0.01} />);
  }

  const horizontal = [];
  for (let y = startY; y <= endY + step * 0.5; y += step) {
    horizontal.push(<Line key={`hy-${y}`} points={[startX, y, endX, y]} stroke="#dbeafe" strokeWidth={0.01} />);
  }

  return <Layer listening={false}>{vertical}{horizontal}</Layer>;
};

export default KonvaGridLayer;
