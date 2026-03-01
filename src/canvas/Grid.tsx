import { metersToSvg } from '../geometry/units';

interface Props {
  widthM: number;
  heightM: number;
  gridM: number;
}

const Grid = ({ widthM, heightM, gridM }: Props) => {
  const step = metersToSvg(gridM);
  const width = metersToSvg(widthM);
  const height = metersToSvg(heightM);
  const lines = [];
  for (let x = 0; x <= width; x += step) lines.push(<line key={`x-${x}`} x1={x} y1={0} x2={x} y2={height} />);
  for (let y = 0; y <= height; y += step) lines.push(<line key={`y-${y}`} x1={0} y1={y} x2={width} y2={y} />);
  return <g stroke="#dbeafe" strokeWidth="1">{lines}</g>;
};

export default Grid;
